export function createPlayerNextController({canAdvance, currentNodeId, setDisabled, advance, applyResponse, onError}) {
  let inFlight = false;
  return async function next() {
    if (inFlight || !canAdvance()) return {advanced: false, skipped: true};
    const nodeId = currentNodeId();
    if (!nodeId) return {advanced: false, skipped: true};
    inFlight = true;
    setDisabled(true);
    try {
      const data = await advance(nodeId);
      await applyResponse(data);
      return {advanced: true, skipped: false};
    } catch (error) {
      onError(error);
      return {advanced: false, skipped: false, error};
    } finally {
      inFlight = false;
      setDisabled(!canAdvance());
    }
  };
}
