import {createNosblocCommerce} from "../server/nosbloc-commerce.js";
export default {fetch:request=>createNosblocCommerce().orderStatus(request)};
