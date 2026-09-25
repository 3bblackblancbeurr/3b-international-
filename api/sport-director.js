import {handleSportDirectorRequest} from '../server/sport-director.js';

export default {
 fetch: request=>handleSportDirectorRequest(request),
};
