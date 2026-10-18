import React from 'react';
import CurrentWorld from './WorldPage.jsx';

// Monde 3B has one official public runtime.
// The historical Origins engine remains in the repository as a reference/backup,
// but users can no longer fall back into an older world version by navigation.
export default function WorldEntry({goTo}){
 // App already owns the asynchronous route boundary and its loading state.
 // A second lazy import here delays every world dependency by another request.
 return <CurrentWorld goTo={goTo}/>;
}
