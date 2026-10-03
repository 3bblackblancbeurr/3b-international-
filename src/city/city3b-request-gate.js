// Background refreshes must neither swallow player actions nor overwrite a newer save.
export function createCityRequestGate() {
  let foreground = false, background = false, revision = 0;
  return {
    get busy() { return Boolean(foreground); },
    invalidate() { revision++; foreground=false; background=false; },
    async run(action, task, accept) {
      const passive = action === 'life';
      if (foreground || (passive && background)) return null;
      const token={};
      if (passive) background = token;
      else { foreground = token; revision++; }
      const started = revision;
      try {
        const result = await task();
        if (started !== revision || (passive && foreground)) return null;
        accept(result);
        return result;
      } finally {
        if (passive&&background===token) background = false;
        else if (!passive&&foreground===token) foreground = false;
      }
    },
  };
}
