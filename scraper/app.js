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
    let recipe, response;

    const res = await axios.get(event.queryStringParameters.url);
    const html = res.data;

    const $ = cheerio.load(html);

    const rawJsonLd = JSON.stringify(
      $("script[type='application/ld+json']")
        .toArray()
        .map((el) => {
          return el.children[0].data.replace(/\n/g, '').trim();
        })
    );

    if (!rawJsonLd) {
      response = formatResponse(400, {
        message: 'site not supported',
      });
      return response;
    }
    const parsedJsonLd = JSON.parse(rawJsonLd).map((el) => JSON.parse(el));

    parsedJsonLd.forEach((element) => {
      if (!element['@type'] && element['@graph']) {
        recipe = element['@graph'].find(
          (val) => val['@type'] === 'Recipe' || val['@type'].includes('Recipe')
        );
        return;
      }
      if (element instanceof Array) {
        recipe = element.find(
          (val) => val['@type'] === 'Recipe' || val['@type'].includes('Recipe')
        );
      } else if (
        element['@type'] === 'Recipe' ||
        element['@type'].includes('Recipe')
      ) {
        recipe = element;
      }
    });

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
