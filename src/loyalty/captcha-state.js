// Turnstile tokens belong to one challenge and must be renewed after submission.
export function captchaChallengeReducer(state, action) {
  if (action.type === 'reset') return { attempt:state.attempt + 1, token:'' };
  if (action.type === 'token' && action.attempt === state.attempt) {
    return { ...state, token:typeof action.token === 'string' ? action.token : '' };
  }
  return state;
}
