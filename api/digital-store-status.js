import {createDigitalStore} from "../server/digital-store.js";
export default {fetch: request => createDigitalStore().status(request)};
