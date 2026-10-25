import { DesktopHome } from "@/components/layout/DesktopHome";
import { Responsive } from "@/components/mobile/Responsive";
import { MobileOffers } from "@/components/mobile/MobileOffers";

/**
 * Home. A laptop gets the hero, the brand tiles and the eleven-column table;
 * a phone gets the offers tab of the app, where the first price is above the
 * fold and nothing scrolls sideways.
 */
export default function Home() {
  return <Responsive mobile={<MobileOffers />} desktop={<DesktopHome />} />;
}
