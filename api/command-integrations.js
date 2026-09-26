import {createCommandIntegrations} from "../server/command-integrations.js";

export default {
 fetch: request=>createCommandIntegrations().handle(request)
};
