import { load } from 'cheerio';

import { ScrapeContext } from '@/utils/context';

import { EmbedsResult, baseUrl, baseUrl2 } from './type';

export async function getEmbeds(ctx: ScrapeContext, id: string): Promise<EmbedsResult> {
  const data = await ctx.fetcher.full(`/${id}`, {
    baseUrl: baseUrl2,
    headers: {
      Referer: baseUrl,
    },
    readHeaders: ['Set-Cookie'],
    method: 'GET',
  });

  const aGoozCookie = data.headers.get('Set-Cookie')?.match(/aGooz=([^;]+)/)?.[1];

  const $ = load(data.body);
  const RandomCookieName = data.body.split(`_3chk('`)[1].split(`'`)[0];
  const RandomCookieValue = data.body.split(`_3chk('`)[1].split(`'`)[2];

  const embedRedirectURLs = $('a')
    .map((index, element) => $(element).attr('href'))
    .get()
    .filter((href) => href && href.includes(`${baseUrl2}/go.php`));

  const embedPages = await Promise.all(
    embedRedirectURLs.map(
      (url) =>
        ctx.fetcher
          .full(url, {
            headers: {
              cookie: `aGooz=${aGoozCookie}; ${RandomCookieName}=${RandomCookieValue};`,
              Referer: baseUrl2,
            },
            method: 'GET',
          })
          .catch(() => null), // Handle errors gracefully
    ),
  );

  // Initialize an array to hold the results
  const results: EmbedsResult = [];

  // Process each page result
  for (const result of embedPages) {
    // Ensure there's a result to process
    if (result) {
      // Attempt to find a matching embed ID
      const embedId = ['wootly', 'upstream', 'mixdrop', 'dood'].find((a) => result.finalUrl.includes(a));
      // If an embed ID is found, push the result to the results array
      if (embedId) {
        results.push({ embedId, url: result.finalUrl });
      }
    }
  }

  return results;
}
