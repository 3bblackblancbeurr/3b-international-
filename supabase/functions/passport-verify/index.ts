import {passportRuntime} from '../../../shared/passport-recognition-runtime.js';
import {createPassportTicketVerifier} from '../../../shared/passport-recognition-tickets.js';

Deno.serve(createPassportTicketVerifier(passportRuntime((name:string)=>Deno.env.get(name))));
