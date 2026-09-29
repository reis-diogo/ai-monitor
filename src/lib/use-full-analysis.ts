"use client";

import { useEffect, useState } from "react";
import type { AnalyzedActivityRecord } from "@/lib/types";

// O registro que chega pela listagem vem sem os campos longos. Quando um modal abre,
// ele busca o parecer inteiro daquele card — uma requisicao por abertura, em vez de
// todos os pareceres a cada minuto.
export function useFullAnalysis(
  record: AnalyzedActivityRecord | null
): AnalyzedActivityRecord | null {
  const [full, setFull] = useState<AnalyzedActivityRecord | null>(null);

  const id = record?.id ?? null;
  const provider = record?.provider ?? null;

  useEffect(() => {
    if (!id || !provider) return;

    let cancelled = false;

    fetch(`/api/analysis/${id}?provider=${provider}`)
      .then(async (res) => {
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled || !data?.analysis) return;
        setFull(data.analysis);
      })
      .catch(() => {
        // Sem o completo, o modal mostra o que veio da listagem.
      });

    return () => {
      cancelled = true;
    };
  }, [id, provider]);

  return full && full.id === id ? full : record;
}
