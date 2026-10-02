import {passportRuntime} from '../../../shared/passport-recognition-runtime.js';
import {createRecognitionHandler} from '../../../shared/passport-recognition-service.js';

// Keys remain inside the trusted Edge runtime/Vault; no private material is returned.
Deno.serve(createRecognitionHandler(passportRuntime((name:string)=>Deno.env.get(name))));
