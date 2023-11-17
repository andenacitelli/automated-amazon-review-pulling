import { ASINS, PARAMETERS } from "./config";
import * as fs from "fs";
import chalk from "chalk";
import puppeteer, { Browser, Page } from "puppeteer";
import { mkdirp } from "mkdirp";
import pRetry from "p-retry";

type Review = {
  author: string;
  reviewTitle: string;
  reviewRating: string;
  reviewDate: string;
  reviewText: string;
};

console.log(
  chalk.green(
    `Pulling reviews for ${ASINS.length} ASIN(s). Please give the browser a moment to start up.`,
  ),
);

const getUrlForAsin = (asin: string): string => {
  return `https://www.amazon.com/exec/obidos/ASIN/${asin}`;
};

const dumpReviews = (asin: string, reviews: Review[]): void => {
  console.log("Dumping reviews: ", JSON.stringify(reviews, undefined, 2));
  let csvText = "";
  csvText += "Author,Review Title,Review Rating,Review Date,Review Text\n";
  csvText += reviews
    .map((review) => {
      return `${review.author},${review.reviewTitle},${review.reviewRating},${review.reviewDate},${review.reviewText}`;
    })
    .join("\n");

  const filename = `data/asin-${asin}.csv`;
  fs.writeFileSync(filename, csvText);
  console.log(chalk.green(`Wrote reviews for ASIN ${asin} to ${filename}.`));
};

const getReviewsForAsin = async (
  browser: Browser,
  asin: string,
): Promise<Review[]> => {
  return pRetry(async () => {
    const page = await browser.newPage();
    const LOW_TIMEOUT = 10000;
    await page.setDefaultTimeout(LOW_TIMEOUT); // time out in 10s rather than default 30s
    await page.setDefaultNavigationTimeout(LOW_TIMEOUT);
    await page.goto(getUrlForAsin(asin));

    const moreReviewsText = await page.waitForSelector("text/See more reviews");
    if (!moreReviewsText) {
      throw Error(
        `Unable to find 'See more reviews' text for ASIN ${asin}. Skipping.`,
      );
    }
    await moreReviewsText.click();
    await page.waitForNavigation();
    await page.select("#star-count-dropdown", "five_star"); // value=xyz field of <option> within <select>

    const reviews: Review[] = [];
    for (const idx of Array.from(
      Array(PARAMETERS.NUM_PAGES_TO_GO_THROUGH).keys(),
    )) {
      const innerReviews = await page.$$eval(
        "div[data-hook='review']",
        (reviewElements) => {
          return reviewElements.map((reviewElement) => {
            const authorElement = reviewElement.querySelector(
              "span.a-profile-name",
            );
            const reviewTitleElement = reviewElement.querySelector(
              "a[data-hook='review-title']",
            );
            const reviewRatingElement = reviewElement.querySelector(
              "i[data-hook='review-star-rating']",
            );
            const reviewDateElement = reviewElement.querySelector(
              "span[data-hook='review-date']",
            );
            const reviewTextElement = reviewElement.querySelector(
              "span[data-hook='review-body']",
            );

            const review: Review = {
              author: authorElement
                ? (authorElement.textContent ?? "").trim().replaceAll("\n", "")
                : "",
              reviewTitle: reviewTitleElement
                ? (reviewTitleElement.textContent ?? "")
                    .replaceAll("\n", "")
                    .replaceAll("5.0 out of 5 stars", "")
                    .replaceAll('"', "")
                    .trim() // weird string Amazon prepends
                : "",
              reviewRating: reviewRatingElement
                ? (reviewRatingElement.textContent ?? "")
                    .replaceAll("\n", "")
                    .replaceAll('"', "")
                    .trim()
                : "",
              reviewDate: reviewDateElement
                ? (reviewDateElement.textContent ?? "")
                    .replaceAll("\n", "")
                    .replaceAll('"', "")
                    .trim()
                : "",
              reviewText: reviewTextElement
                ? (reviewTextElement.textContent ?? "")
                    .replaceAll("\n", "")
                    .replaceAll('"', "")
                    .trim()
                : "",
            };
            console.log("Review: ", JSON.stringify(review, undefined, 2));
            return review;
          });
        },
      );
      reviews.push(...innerReviews);

      const nextPageButton = await page.waitForSelector(
        // Puppeteer gives you a selector if you right click the DOM and hit "copy selector" which is where this is from
        // This is probably a bit brittle but will work for a v0
        "#cm_cr-pagination_bar > ul > li.a-last > a",
      );
      if (!nextPageButton) {
        console.error(
          `Unable to find 'Next Page' button for ASIN ${asin}. Skipping.`,
        );
        continue;
      }
      await nextPageButton.click();
    }

    await page.close();
    return reviews;
  });
};

const main = async () => {
  mkdirp.sync("./data");
  const browser = await puppeteer.launch({ headless: false });
  await Promise.all(
    ASINS.map(async (asin) => {
      const reviews = await getReviewsForAsin(browser, asin.asin);
      dumpReviews(asin.asin, reviews);
    }),
  );
  await browser.close();
};

main().catch(console.error);
