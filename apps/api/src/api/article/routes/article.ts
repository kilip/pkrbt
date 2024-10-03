/**
 * article router
 */

import { factories } from "@strapi/strapi";

export default factories.createCoreRouter("api::article.article", {
  config: {
    find: {
      middlewares: ["global::blog-populate"],
    },
    findOne: {
      middlewares: ["global::blog-populate"],
    },
  },
});
