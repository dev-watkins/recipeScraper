const axios = require('axios');
const cheerio = require('cheerio');

const formatResponse = (statusCode, body) => {
  const res = {
    statusCode,
    body: body ? JSON.stringify(body) : '',
    headers: {
      'Content-Type': 'application/json',
    },
  };
  console.log(res);
  return res;
};

exports.handler = async (event) => {
  console.log(event);
  try {
    let response;

    const res = await axios.get(event.queryStringParameters.url);
    const html = res.data;

    const $ = cheerio.load(html);

    const parsedJsonLd = $("script[type='application/ld+json']")
      .toArray()
      .map((el) => {
        return JSON.parse(el.children[0].data.replace(/\n/g, '').trim());
      })
      .map((el) => {
        if (el instanceof Array) {
          return el.find(
            (val) =>
              val['@type'] === 'Recipe' || val['@type'].includes('Recipe')
          );
        }
        return el;
      });

    console.log(parsedJsonLd);

    if (!parsedJsonLd.length) {
      response = formatResponse(400, {
        message: 'site not supported',
      });
      return response;
    }

    const recipe = parsedJsonLd.filter((element) => {
      if (!element['@type'] && element['@graph']) {
        return element['@graph'].find(
          (val) => val['@type'] === 'Recipe' || val['@type'].includes('Recipe')
        );
      }

      if (element['@type'] === 'Recipe' || element['@type'].includes('Recipe'))
        return true;

      return false;
    })[0];

    console.log(recipe);

    if (!recipe) {
      console.log('no recipe found on page');
      response = formatResponse(400, { message: 'no recipe found on page' });
      return response;
    }

    response = formatResponse(200, recipe);

    return response;
  } catch (err) {
    console.log(err);

    if (err instanceof axios.AxiosError) {
      return formatResponse(503, {
        message: 'unable to reach target',
      });
    }
    return formatResponse(500);
  }
};
