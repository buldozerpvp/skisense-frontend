const Cloud = ({ shape, place }: { shape: "cumulus" | "strato"; place: string }) => {
  return (
    <div className={`ss-cloud ss-cloud--${shape} ss-cloud--${place}`}>
      <span className="ss-cloud__shade" />
      <span className="ss-cloud__body" />
      <span className="ss-cloud__light" />
    </div>
  );
};

export const SkyBackdrop = () => {
  return (
    <div className="ss-sky" aria-hidden>
      <Cloud shape="cumulus" place="far" />
      <Cloud shape="strato" place="high" />
      <div className="ss-snow ss-snow--far" />
      <Cloud shape="strato" place="low" />
      <div className="ss-snow ss-snow--mid" />
      <Cloud shape="cumulus" place="hero" />
      <div className="ss-snow ss-snow--near" />
    </div>
  );
};
