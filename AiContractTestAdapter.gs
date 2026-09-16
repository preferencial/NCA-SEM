// AiContractTestAdapter.gs — FROTA-08 (Preferencial - NCA-SEM)
function _AiContractSubject_() {
  return typeof generateAiInsights === 'function'
    ? generateAiInsights({ stats: {}, overview: {} })
    : AiInsights_callGemini_('key-teste', 'smoke test');
}