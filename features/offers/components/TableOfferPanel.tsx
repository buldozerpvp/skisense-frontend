"use client";

import { useEffect, useMemo } from "react";
import { useAllOffers, useLatestOffers } from "@/features/prices/hooks/usePrices";
import { buildOffers } from "@/features/offers/lib/offerModel";
import { useOpenOffer } from "@/features/offers/hooks/useOpenOffer";
import { OfferPanel } from "@/features/offers/offer-detail/components/OfferPanel";
import { usePreloadOfferPanel } from "@/features/offers/offer-detail/hooks/usePreloadOfferPanel";

export const TableOfferPanel = () => {
  const key = useOpenOffer((state) => state.key);
  const open = useOpenOffer((state) => state.open);
  const close = useOpenOffer((state) => state.close);
  const { data } = useLatestOffers();
  const history = useAllOffers();
  usePreloadOfferPanel();

  useEffect(() => {
    if (!data || !history.data) return;
    const idle = window.requestIdleCallback ?? ((callback: () => void) => window.setTimeout(callback, 300));
    const cancel = window.cancelIdleCallback ?? window.clearTimeout;
    const handle = idle(() => buildOffers(data, history.data));
    return () => cancel(handle);
  }, [data, history.data]);

  const offers = useMemo(() => (key ? buildOffers(data, history.data) : []), [key, data, history.data]);
  const offer = useMemo(
    () => (key ? offers.find((candidate) => candidate.key === key) ?? null : null),
    [offers, key]
  );

  return (
    <OfferPanel
      offer={offer}
      siblings={offers}
      surface="drawer"
      onClose={close}
      onPick={(picked) => open(picked.key)}
    />
  );
};
