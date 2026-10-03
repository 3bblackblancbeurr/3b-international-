// Background refreshes must neither swallow player actions nor overwrite a newer save.
export function createCityRequestGate() {
  let foreground = false, background = false, revision = 0;
  return {
    get busy() { return foreground; },
    async run(action, task, accept) {
      const passive = action === 'life';
      if (foreground || (passive && background)) return null;
      if (passive) background = true;
      else { foreground = true; revision++; }
      const started = revision;
      try {
        const result = await task();
        if (passive && (foreground || started !== revision)) return null;
        accept(result);
        return result;
      } finally {
        if (passive) background = false;
        else foreground = false;
      }
    },
  };
}
