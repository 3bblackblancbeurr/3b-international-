import {createNosblocCommerce} from "../server/nosbloc-commerce.js";
export default {fetch:request=>createNosblocCommerce().connect(request)};
