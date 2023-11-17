# Overview

This is a helper script that uses Puppeteer, a headless browsing automation library, to bulk pull down reviews for a given set of Amazon ASINs. 

It generally takes less than 10 seconds to pull tens to hundreds of reviews, and exports to `.csv`, which you can easily load into Excel or similar.

Parameters are tunable by editing `config.ts` or the code itself in `index.ts`.

## To Install

Dependencies:

- Install [Node.js](https://nodejs.org/en/download) for your system. The LTS (20) is fine.
- [VSCode](https://code.visualstudio.com/) is recommended as a good, extensible code editor that comes with a terminal you can use. I don't expect you to run code, but I figure you'll be curious and need to edit ASINs and tweak parameters and stuff if you want.

To get this code on your machine:

- Either [Install Git](https://git-scm.com/downloads) and run `git clone <repo_url>` to pull it down, or click on the green "Code" button in GitHub and click "Download Zip". Extract that wherever you wish. Bonus points for Git, as that'll install Git Bash, which is much friendlier than the default for Windows (which is likely command prompt).

Open VSCode and open the folder you cloned to. Figure out how to open a terminal and do so.

## To Run

First, edit `config.ts` to have a few ASINs you'd like to scrape reviews for. Don't do every single one yet - warm up to it. Amazon will probably have some automatic spam detection if you run this nonstop, anyway.

```ts
export const ASINS: {
  asin: string;
}[] = [
  {
    asin: "B00192I3QQ",
  },
  {
    asin: "B00192I3QQ",
  },
  // ...
];

```

Run `npm run start` in your terminal, which is configured to run the main `index.ts` script that you have.

## Tweaks

If you want to see the browser as it's doing stuff, modify `index.ts` and change the `{ headless: "new" }` section to `{ headless: false }`. The next time you run the program, it'll get you started.

# FAQ

## Are there any limits on how frequently I can run this?

Most large companies somewhat limit scraping on their sites - expect some slight inconsistency and a few retries if you're running these against fifty products at once, or going through a lot of reviews, or something. I tried to build this pretty resilient w/ retry logic that would still work well, just take longer, so we'll see if it pays off.