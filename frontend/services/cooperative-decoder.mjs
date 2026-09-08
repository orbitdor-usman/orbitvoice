// Transformers 4.2 Whisper drops the public stopping_criteria argument before
// forwarding to its base decoder. Attach it at the criterion factory instead,
// so cancellation follows the normal cache-disposal path, not a thrown error.
export function installCooperativeDecoder(model, getStopping, yieldTask = () => new Promise(resolve => setTimeout(resolve, 0))) {
  const criteria = model._get_stopping_criteria.bind(model);
  const forward = model.forward.bind(model);
  model._get_stopping_criteria = (...args) => {
    const list = criteria(...args);
    const stopping = getStopping();
    if (stopping) list.push(stopping);
    return list;
  };
  model.forward = async (...args) => {
    // CPU WASM can otherwise monopolize the worker's microtask queue. Yield at
    // token boundaries so cancel/final-priority messages can actually arrive.
    await yieldTask();
    return forward(...args);
  };
}
