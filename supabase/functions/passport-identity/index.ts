import encodeQR from 'qr';
import {passportRuntime} from '../../../shared/passport-recognition-runtime.js';
import {createPassportTicketIssuer} from '../../../shared/passport-recognition-tickets.js';

Deno.serve(createPassportTicketIssuer(passportRuntime((name:string)=>Deno.env.get(name)),encodeQR));
