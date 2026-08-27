"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Award,
  Check,
  CreditCard,
  Eye,
  Images,
  Layers3,
  LayoutTemplate,
  Printer,
  ReceiptText,
  ShieldCheck,
  Truck,
  WandSparkles,
  X,
} from "lucide-react";
import { mockAgent } from "./mock-agent";
import {
  createOrderId,
  deliveryOptions,
  formatMYR,
  paymentMethods,
  printSizes,
  recordPrintOrder,
  type PrintOrder,
} from "./print-orders";
import { mattePortrait } from "./portrait-matting";
import { recordCutoutAsset } from "./designer-store";

export type BrandAssetPhoto = {
  id: string;
  dataUrl: string;
  category?: "atlas" | "awards";
  agentName?: string;
  agentId?: string;
  agentMobile?: string;
  agentRenTag?: string;
  agentOfficePhone?: string;
};
type Template = "subsale" | "awards";
type SubsaleDetails = {
  name: string;
  mobile: string;
  ren: string;
  officePhone: string;
};
// Demo fallback: portraits taken without an Atlas appointment carry the mock agent, so the banner uses these sample details.
const showAwardsTemplate = false; // the awards night mockup is parked until its layout is ready; the subsale board is the only template on offer
const mockAtlasDetails = {
  name: mockAgent.agentName.toUpperCase(),
  mobile: mockAgent.agentMobile,
  ren: mockAgent.agentRenTag,
  officePhone: mockAgent.agentOfficePhone,
};

export default function BrandAssetStudio({
  photos,
  onOpenPhotos,
  onToast,
}: {
  photos: BrandAssetPhoto[];
  onOpenPhotos: () => void;
  onToast: (message: string) => void;
}) {
  const [screen, setScreen] = useState<"select" | "editor">("select");
  const [selectedId, setSelectedId] = useState(photos[0]?.id ?? ""),
    [template, setTemplate] = useState<Template>("subsale"),
    [cutout, setCutout] = useState(""),
    [removing, setRemoving] = useState(Boolean(photos[0])),
    [exporting, setExporting] = useState(false),
    [name, setName] = useState(photos[0]?.agentName || "AGENT NAME"),
    [award, setAward] = useState("Top Producer 2026"),
    [scale, setScale] = useState(defaultSubsaleScale),
    [position, setPosition] = useState(0),
    [offset, setOffset] = useState(0),
    [artwork, setArtwork] = useState(""),
    [ordering, setOrdering] = useState(false),
    [order, setOrder] = useState<PrintOrder | null>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const photo = photos.find((item) => item.id === selectedId) ?? photos[0],
    portrait = cutout || (template === "awards" ? photo?.dataUrl : "") || "",
    subsaleDetails = getSubsaleDetails(photo, name),
    usingMockDetails = !hasRealAtlasDetails(photo);
  const choosePhoto = (next: BrandAssetPhoto) => {
    setSelectedId(next.id);
    setCutout("");
    setRemoving(true);
    setName(next.agentName || "AGENT NAME");
  };
  const chooseTemplate = (next: Template) => {
    setTemplate(next);
    setScale((current) =>
      next === "subsale"
        ? Math.min(Math.max(current, 40), 150)
        : Math.min(Math.max(current, 80), 130),
    );
    setPosition((current) =>
      next === "subsale"
        ? Math.min(Math.max(current, -100), 100)
        : Math.min(Math.max(current, -20), 20),
    );
    const tagged = photos.find(
      (item) => categoryOf(item) === (next === "awards" ? "awards" : "atlas"),
    );
    if (tagged && tagged.id !== photo?.id) choosePhoto(tagged);
  };
  const keepCutout = useCallback(
    (result: string) => {
      if (!photo) return;
      setCutout(result);
      void recordCutoutAsset({
        photoId: photo.id,
        agentId: photo.agentId || "unknown",
        agentName: photo.agentName || "Agent",
        dataUrl: photo.dataUrl,
        cutoutDataUrl: result,
      });
    },
    [photo],
  );
  const removeBackground = async () => {
    if (!photo || removing) return;
    setRemoving(true);
    try {
      keepCutout(await createPortraitCutout(photo.dataUrl));
      onToast("AI background removed");
    } catch {
      onToast("Background removal could not finish. Try another photo.");
    } finally {
      setRemoving(false);
    }
  };
  const startPrintOrder = async () => {
    if (!cutout || exporting) return;
    setExporting(true);
    try {
      setArtwork(
        await renderSubsaleBanner(cutout, {
          scale,
          position,
          offset,
          details: subsaleDetails,
        }),
      );
      setOrder(null);
      setOrdering(true);
    } catch {
      onToast("The print file could not be prepared.");
    } finally {
      setExporting(false);
    }
  };
  const closePrintOrder = useCallback(() => {
    setOrdering(false);
  }, []);
  const confirmPrintOrder = (placed: PrintOrder) => {
    setOrder(placed);
    onToast(`Print order ${placed.id} paid · ${formatMYR(placed.total)}`);
  };
  const previewFullscreen = async () => {
    try {
      await previewRef.current?.requestFullscreen();
    } catch {
      onToast("Full-screen preview is not available in this browser.");
    }
  };
  useEffect(() => {
    if (!photo?.dataUrl) return;
    let active = true;
    createPortraitCutout(photo.dataUrl)
      .then((result) => {
        if (active) keepCutout(result);
      })
      .catch(() => {
        if (active)
          onToast(
            "Background removal could not finish. Choose another portrait or retry.",
          );
      })
      .finally(() => {
        if (active) setRemoving(false);
      });
    return () => {
      active = false;
    };
  }, [photo?.dataUrl, keepCutout, onToast]);
  if (!photo)
    return (
      <section className="asset-empty">
        <span>
          <Images size={28} />
        </span>
        <h1>Create brand assets</h1>
        <p>
          Save or import a portrait first. Your approved photo can then be
          placed into a banner template.
        </p>
        <button type="button" onClick={onOpenPhotos}>
          Open Photos
        </button>
      </section>
    );
  if (screen === "select")
    return (
      <section className="asset-studio">
        <header className="asset-header">
          <div>
            <span className="eyebrow">BRAND TEMPLATES</span>
            <h1>Choose a format.</h1>
            <p>Pick a template. More formats are on the way.</p>
          </div>
          <span className="asset-local">
            <ShieldCheck size={15} /> Local and private
          </span>
        </header>
        <div className="asset-template-grid">
          <button
            type="button"
            className="asset-template-card"
            onClick={() => setScreen("editor")}
          >
            <LayoutTemplate size={22} />
            <b>Subsale banner</b>
            <small>Designer artwork · Print ready</small>
          </button>
          <button
            type="button"
            className="asset-template-card"
            disabled
            aria-disabled="true"
          >
            <CreditCard size={22} />
            <b>Business card</b>
            <small>Agent contact card for print</small>
            <i className="asset-coming-soon">Coming soon</i>
          </button>
          <button
            type="button"
            className="asset-template-card"
            disabled
            aria-disabled="true"
          >
            <Award size={22} />
            <b>Awards night preview</b>
            <small>16 : 9 stage screen mockup</small>
            <i className="asset-coming-soon">Coming soon</i>
          </button>
        </div>
      </section>
    );
  return (
    <section className="asset-studio">
      <button
        type="button"
        className="asset-back"
        onClick={() => setScreen("select")}
      >
        <ArrowLeft size={15} /> All formats
      </button>
      <header className="asset-header">
        <div>
          <span className="eyebrow">BRAND TEMPLATES</span>
          <h1>Place your portrait.</h1>
          <p>The cutout is automatic. Logo, colours and layout stay locked.</p>
        </div>
        <span className="asset-local">
          <ShieldCheck size={15} /> Local and private
        </span>
      </header>
      <div className="asset-layout">
        <aside className="asset-controls">
          <section className="asset-control-group">
            <div className="asset-group-title">
              <span>01</span>
              <div>
                <b>Choose portrait</b>
                <small>Approved photos</small>
              </div>
            </div>
            <div className="asset-photo-list" role="list">
              {photos.map((item) => (
                <button
                  type="button"
                  className={`${item.id === photo.id ? "active" : ""} ${categoryOf(item)}`}
                  onClick={() => choosePhoto(item)}
                  aria-pressed={item.id === photo.id}
                  key={item.id}
                >
                  <img
                    src={item.dataUrl}
                    alt={`${item.agentName || "Saved portrait"} · ${categoryLabel(item)}`}
                    width={58}
                    height={72}
                  />
                  <em>{categoryLabel(item)}</em>
                  {item.id === photo.id ? (
                    <i>
                      <Check size={13} />
                    </i>
                  ) : null}
                </button>
              ))}
            </div>
          </section>
          <section className="asset-control-group">
            <div className="asset-group-title">
              <span>02</span>
              <div>
                <b>Background removal</b>
                <small>Required for this template</small>
              </div>
            </div>
            <button
              type="button"
              className={`asset-ai-button ${cutout ? "done" : ""}`}
              onClick={() => void removeBackground()}
              disabled={removing}
            >
              {cutout ? <Check size={18} /> : <WandSparkles size={18} />}
              <span>
                <b>
                  {removing
                    ? "Removing background…"
                    : cutout
                      ? "Background removed"
                      : "Retry background removal"}
                </b>
                <small>
                  {cutout
                    ? "Transparent portrait applied automatically"
                    : "Nothing exports until this is ready"}
                </small>
              </span>
            </button>
          </section>
          <section className="asset-control-group">
            <div className="asset-group-title">
              <span>03</span>
              <div>
                <b>
                  {template === "subsale"
                    ? "Atlas information"
                    : "Event details"}
                </b>
                <small>
                  {template === "subsale"
                    ? "Filled from the agent profile"
                    : "Editable fields"}
                </small>
              </div>
            </div>
            {template === "awards" ? (
              <>
                <label className="asset-field">
                  <span>Name</span>
                  <input
                    value={name}
                    onChange={(event) =>
                      setName(event.target.value.toUpperCase())
                    }
                    maxLength={32}
                  />
                </label>
                <label className="asset-field">
                  <span>Award</span>
                  <input
                    value={award}
                    onChange={(event) => setAward(event.target.value)}
                    maxLength={46}
                  />
                </label>
              </>
            ) : (
              <>
                <p className="asset-template-note">
                  The layout follows the approved 3 × 2 For Sale board.{" "}
                  {usingMockDetails
                    ? "This portrait has no Atlas appointment, so sample agent details are used for the demo."
                    : "Agent details come from the Atlas appointment."}
                </p>
                <dl className="asset-atlas-info">
                  <div>
                    <dt>Mobile</dt>
                    <dd>{subsaleDetails.mobile}</dd>
                  </div>
                  <div>
                    <dt>Name</dt>
                    <dd>{subsaleDetails.name}</dd>
                  </div>
                  <div>
                    <dt>REN</dt>
                    <dd>{subsaleDetails.ren}</dd>
                  </div>
                  <div>
                    <dt>Office</dt>
                    <dd>{subsaleDetails.officePhone}</dd>
                  </div>
                </dl>
              </>
            )}
            <div className="asset-range">
              <span>
                <label htmlFor="asset-portrait-size">Portrait size</label>
                <output>{scale}%</output>
              </span>
              <input
                id="asset-portrait-size"
                type="range"
                min={template === "subsale" ? 70 : 80}
                max={template === "subsale" ? 80 : 130}
                value={scale}
                onChange={(event) => setScale(Number(event.target.value))}
              />
            </div>
            <div className="asset-range">
              <span>
                <label htmlFor="asset-portrait-position">
                  Vertical position
                </label>
                <output>
                  {template === "subsale" ? `${position}%` : position}
                </output>
              </span>
              <input
                id="asset-portrait-position"
                type="range"
                min={template === "subsale" ? 0 : -20}
                max={template === "subsale" ? 30 : 20}
                value={position}
                onChange={(event) => setPosition(Number(event.target.value))}
              />
            </div>
            {template === "subsale" ? (
              <div className="asset-range">
                <span>
                  <label htmlFor="asset-portrait-offset">
                    Horizontal position
                  </label>
                  <output>{offset}%</output>
                </span>
                <input
                  id="asset-portrait-offset"
                  type="range"
                  min="0"
                  max="30"
                  value={offset}
                  onChange={(event) => setOffset(Number(event.target.value))}
                />
              </div>
            ) : null}
          </section>
        </aside>
        <div className="asset-workbench">
          <div className="asset-tabs" aria-label="Designer template">
            <button
              type="button"
              className={template === "subsale" ? "active" : ""}
              onClick={() => chooseTemplate("subsale")}
              aria-pressed={template === "subsale"}
            >
              <LayoutTemplate size={17} />
              <span>
                <b>Subsale banner</b>
                <small>Designer artwork · Print ready</small>
              </span>
            </button>
            {showAwardsTemplate ? (
              <button
                type="button"
                className={template === "awards" ? "active" : ""}
                onClick={() => chooseTemplate("awards")}
                aria-pressed={template === "awards"}
              >
                <Award size={17} />
                <span>
                  <b>Awards night</b>
                  <small>16:9 · Preview</small>
                </span>
              </button>
            ) : null}
          </div>
          <div className="designer-lock">
            <Layers3 size={15} />
            <span>
              <b>Designer artwork</b> Logo, colours and layout are locked
            </span>
          </div>
          <div ref={previewRef} className={`asset-preview-shell ${template}`}>
            {template === "subsale" ? (
              <SubsaleBannerPreview
                portrait={portrait}
                details={subsaleDetails}
                scale={scale}
                position={position}
                offset={offset}
                cutout={Boolean(cutout)}
              />
            ) : (
              <AwardsPreview
                portrait={portrait}
                name={name}
                award={award}
                scale={scale}
                position={position}
                cutout={Boolean(cutout)}
              />
            )}
          </div>
          {template === "subsale" ? (
            <div
              className={`asset-export-bar ${usingMockDetails ? "mock-atlas" : ""}`}
            >
              <div>
                <span>
                  <Check size={16} />
                  {usingMockDetails
                    ? "Designer template with sample agent details"
                    : "Designer template and Atlas details applied"}
                </span>
                <small>
                  {usingMockDetails
                    ? "2650 × 1786 print file · book through Atlas to replace the sample mobile and REN"
                    : `2650 × 1786 print file · boards from ${formatMYR(printSizes[0].price)}`}
                </small>
              </div>
              <button
                type="button"
                onClick={() => void startPrintOrder()}
                disabled={exporting || !cutout}
              >
                <Printer size={18} />
                {removing
                  ? "Removing background…"
                  : exporting
                    ? "Preparing artwork…"
                    : "Send for printing"}
              </button>
            </div>
          ) : (
            <div className="asset-preview-bar">
              <div>
                <span>
                  <Eye size={16} /> Preview only
                </span>
                <small>16:9 screen mockup · Nothing will be downloaded</small>
              </div>
              <button type="button" onClick={() => void previewFullscreen()}>
                <Eye size={17} /> Preview full screen
              </button>
            </div>
          )}
        </div>
      </div>
      {ordering ? (
        <PrintOrderSheet
          artwork={artwork}
          details={subsaleDetails}
          agentId={photo?.agentId}
          order={order}
          onClose={closePrintOrder}
          onPaid={confirmPrintOrder}
          onToast={onToast}
        />
      ) : null}
    </section>
  );
}

function PrintOrderSheet({
  artwork,
  details,
  agentId,
  order,
  onClose,
  onPaid,
  onToast,
}: {
  artwork: string;
  details: SubsaleDetails;
  agentId?: string;
  order: PrintOrder | null;
  onClose: () => void;
  onPaid: (order: PrintOrder) => void;
  onToast: (message: string) => void;
}) {
  const [sizeId, setSizeId] = useState(printSizes[0].id),
    [quantity, setQuantity] = useState(1),
    [deliveryId, setDeliveryId] = useState(deliveryOptions[0].id),
    [address, setAddress] = useState(""),
    [methodId, setMethodId] = useState(paymentMethods[0].id),
    [paying, setPaying] = useState(false),
    [receiptRequested, setReceiptRequested] = useState(false);
  const size = printSizes.find((item) => item.id === sizeId) ?? printSizes[0],
    delivery =
      deliveryOptions.find((item) => item.id === deliveryId) ??
      deliveryOptions[0],
    method =
      paymentMethods.find((item) => item.id === methodId) ?? paymentMethods[0];
  const subtotal = size.price * quantity,
    total = subtotal + delivery.price,
    needsAddress = delivery.id === "courier",
    ready = !paying && (!needsAddress || address.trim().length > 9);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  // Demo payment: the delay stands in for a bank redirect, nothing leaves the browser.
  const pay = () => {
    if (!ready) return;
    setPaying(true);
    window.setTimeout(() => {
      onPaid(
        recordPrintOrder({
          id: createOrderId(),
          createdAt: new Date().toISOString(),
          agentName: details.name,
          agentId,
          sizeLabel: size.label,
          quantity,
          deliveryLabel: delivery.label,
          address: needsAddress ? address.trim() : "",
          methodLabel: method.label,
          subtotal,
          deliveryFee: delivery.price,
          total,
          status: "paid",
        }),
      );
    }, 1400);
  };
  // No payment provider exists in the demo, so the request is only acknowledged here;
  // the print partner issues the receipt out of band.
  const requestReceipt = () => {
    if (!order || receiptRequested) return;
    setReceiptRequested(true);
    onToast(`Receipt requested for ${order.id}`);
  };
  return (
    <div
      className="print-sheet"
      role="dialog"
      aria-modal="true"
      aria-label="Send banner for printing"
    >
      <button
        type="button"
        className="print-scrim"
        onClick={onClose}
        aria-label="Close print order"
      />
      <div className="print-card">
        <header>
          <div>
            <span>PRINT ORDER</span>
            <b>
              {order ? "Payment received" : "Send this banner for printing"}
            </b>
          </div>
          <button type="button" onClick={onClose} aria-label="Close">
            <X size={17} />
          </button>
        </header>
        {order ? (
          <div className="print-done">
            <div className="print-done-tick">
              <Check size={26} />
            </div>
            <b>{order.id}</b>
            <p>
              Artwork is queued with the IQI print partner.{" "}
              {order.address
                ? `Delivery to ${order.address}.`
                : "Collect at the IQI office when notified."}
            </p>
            <dl className="print-summary">
              <div>
                <dt>Board</dt>
                <dd>
                  {order.sizeLabel} × {order.quantity}
                </dd>
              </div>
              <div>
                <dt>Delivery</dt>
                <dd>{order.deliveryLabel}</dd>
              </div>
              <div>
                <dt>Paid with</dt>
                <dd>{order.methodLabel}</dd>
              </div>
              <div>
                <dt>Total</dt>
                <dd>{formatMYR(order.total)}</dd>
              </div>
            </dl>
            {receiptRequested ? (
              <p className="print-receipt-sent">
                <Check size={15} />
                Receipt request sent
              </p>
            ) : (
              <button
                type="button"
                className="print-receipt"
                onClick={requestReceipt}
              >
                <ReceiptText size={16} />
                Request Receipt
              </button>
            )}
            <button type="button" className="print-pay" onClick={onClose}>
              Done
            </button>
          </div>
        ) : (
          <div className="print-body">
            <div className="print-proof">
              {artwork ? (
                <img
                  src={artwork}
                  alt="Print-ready subsale banner"
                  width={2650}
                  height={1786}
                />
              ) : null}
              <small>
                {details.name} · {details.mobile}
              </small>
            </div>
            <fieldset className="print-group">
              <legend>Board size</legend>
              {printSizes.map((option) => (
                <label
                  key={option.id}
                  className={`print-option ${option.id === sizeId ? "active" : ""}`}
                >
                  <input
                    type="radio"
                    name="print-size"
                    value={option.id}
                    checked={option.id === sizeId}
                    onChange={() => setSizeId(option.id)}
                  />
                  <span>
                    <b>{option.label}</b>
                    <small>{option.detail}</small>
                  </span>
                  <em>{formatMYR(option.price)}</em>
                </label>
              ))}
            </fieldset>
            <div className="print-quantity">
              <span>Quantity</span>
              <div>
                <button
                  type="button"
                  onClick={() => setQuantity((value) => Math.max(1, value - 1))}
                  aria-label="Fewer boards"
                >
                  −
                </button>
                <output>{quantity}</output>
                <button
                  type="button"
                  onClick={() =>
                    setQuantity((value) => Math.min(20, value + 1))
                  }
                  aria-label="More boards"
                >
                  +
                </button>
              </div>
            </div>
            <fieldset className="print-group">
              <legend>Delivery</legend>
              {deliveryOptions.map((option) => (
                <label
                  key={option.id}
                  className={`print-option ${option.id === deliveryId ? "active" : ""}`}
                >
                  <input
                    type="radio"
                    name="print-delivery"
                    value={option.id}
                    checked={option.id === deliveryId}
                    onChange={() => setDeliveryId(option.id)}
                  />
                  <span>
                    <b>{option.label}</b>
                    <small>{option.detail}</small>
                  </span>
                  <em>{option.price ? formatMYR(option.price) : "Free"}</em>
                </label>
              ))}
            </fieldset>
            {needsAddress ? (
              <label className="asset-field print-address">
                <span>Site address</span>
                <input
                  value={address}
                  onChange={(event) => setAddress(event.target.value)}
                  placeholder="Unit, street, postcode, state"
                  maxLength={120}
                />
              </label>
            ) : null}
            <fieldset className="print-group">
              <legend>Payment method</legend>
              {paymentMethods.map((option) => (
                <label
                  key={option.id}
                  className={`print-option ${option.id === methodId ? "active" : ""}`}
                >
                  <input
                    type="radio"
                    name="print-method"
                    value={option.id}
                    checked={option.id === methodId}
                    onChange={() => setMethodId(option.id)}
                  />
                  <span>
                    <b>{option.label}</b>
                    <small>{option.detail}</small>
                  </span>
                  <em>
                    <CreditCard size={15} />
                  </em>
                </label>
              ))}
            </fieldset>
            <dl className="print-summary">
              <div>
                <dt>Boards</dt>
                <dd>{formatMYR(subtotal)}</dd>
              </div>
              <div>
                <dt>
                  <Truck size={13} /> Delivery
                </dt>
                <dd>{delivery.price ? formatMYR(delivery.price) : "Free"}</dd>
              </div>
              <div className="print-total">
                <dt>Total</dt>
                <dd>{formatMYR(total)}</dd>
              </div>
            </dl>
            <button
              type="button"
              className="print-pay"
              onClick={pay}
              disabled={!ready}
            >
              {paying ? "Confirming payment…" : `Pay ${formatMYR(total)}`}
            </button>
            <small className="print-note">
              Demo checkout · no live payment is processed and no card details
              are collected.
            </small>
          </div>
        )}
      </div>
    </div>
  );
}

function SubsaleBannerPreview({
  portrait,
  details,
  scale,
  position,
  offset,
  cutout,
}: {
  portrait: string;
  details: SubsaleDetails;
  scale: number;
  position: number;
  offset: number;
  cutout: boolean;
}) {
  const layout = useSubsaleTextLayout(details),
    cqw = (value: number) => `${value / bannerUnit}cqw`,
    [loaded, setLoaded] = useState<{
      src: string;
      width: number;
      height: number;
    } | null>(null),
    natural = loaded && loaded.src === portrait ? loaded : null;
  const fit = fitSubsalePortrait(
      natural?.width ?? 960,
      natural?.height ?? 1200,
      scale,
      position,
      offset,
    ),
    portraitStyle = {
      left: `${(fit.x / bannerWidth) * 100}%`,
      top: `${(fit.y / bannerHeight) * 100}%`,
      width: `${(fit.width / bannerWidth) * 100}%`,
      height: `${(fit.height / bannerHeight) * 100}%`,
    };
  return (
    <div className={`subsale-banner-preview ${cutout ? "has-cutout" : ""}`}>
      <img
        className="subsale-artwork"
        src="/subsale-banner-template.png"
        alt="IQI For Sale designer banner template"
        width={2650}
        height={1786}
      />
      <strong
        className="subsale-mobile"
        style={layout ? { fontSize: cqw(layout.mobile) } : undefined}
      >
        {details.mobile}
      </strong>
      <div
        className="subsale-agent-line"
        style={layout ? { fontSize: cqw(layout.name) } : undefined}
      >
        <strong style={layout ? { maxWidth: cqw(layout.nameMax) } : undefined}>
          {details.name}
        </strong>
        <span style={layout ? { fontSize: cqw(layout.ren) } : undefined}>
          {details.ren}
        </span>
      </div>
      <strong
        className="subsale-office-phone"
        style={layout ? { fontSize: cqw(layout.officePhone) } : undefined}
      >
        {details.officePhone}
      </strong>
      <div className="subsale-photo">
        {portrait ? (
          <img
            src={portrait}
            alt="Agent portrait with background removed"
            width={960}
            height={1200}
            onLoad={(event) =>
              setLoaded({
                src: portrait,
                width: event.currentTarget.naturalWidth,
                height: event.currentTarget.naturalHeight,
              })
            }
            style={portraitStyle}
          />
        ) : (
          <span>
            <WandSparkles size={22} /> Removing background…
          </span>
        )}
      </div>
    </div>
  );
}

function AwardsPreview({
  portrait,
  name,
  award,
  scale,
  position,
  cutout,
}: {
  portrait: string;
  name: string;
  award: string;
  scale: number;
  position: number;
  cutout: boolean;
}) {
  return (
    <div className={`awards-preview ${cutout ? "has-cutout" : ""}`}>
      <div className="awards-beam one" />
      <div className="awards-beam two" />
      <div className="awards-copy">
        <span>PROFILE LAB AI AWARDS NIGHT · 2026</span>
        <Award size={30} />
        <small>CELEBRATING EXCELLENCE</small>
        <h2>{name || "Agent Name"}</h2>
        <p>{award || "Top Producer 2026"}</p>
      </div>
      <div className="awards-photo">
        <img
          src={portrait}
          alt="Awards night screen portrait preview"
          width={960}
          height={1200}
          style={{
            transform: `translateY(${position}%) scale(${scale / 100})`,
          }}
        />
      </div>
      <div className="awards-footer">
        <span>PROFILE LAB AI</span>
        <i />
        <b>YOUR SUCCESS. OUR PRIDE.</b>
      </div>
    </div>
  );
}

export async function createPortraitCutout(src: string) {
  const image = await loadAssetImage(src),
    vision = await import("@mediapipe/tasks-vision"),
    files = await vision.FilesetResolver.forVisionTasks("/mediapipe"),
    segmenter = await vision.ImageSegmenter.createFromOptions(files, {
      baseOptions: { modelAssetPath: "/selfie_segmenter.tflite" },
      runningMode: "IMAGE",
      outputConfidenceMasks: true,
      outputCategoryMask: false,
    });
  try {
    const result = segmenter.segment(image);
    try {
      const mask = result.confidenceMasks?.[0];
      if (!mask) throw new Error("No person mask");
      const values = new Float32Array(mask.getAsFloat32Array()),
        maskWidth = mask.width,
        maskHeight = mask.height;
      // The segmenter only locates the person. The edge - vignetted backdrop, cast shadow, hair strands, colour decontamination - is
      // solved by classical matting at native resolution; if that cannot finish, the plain segmenter cutout keeps the demo moving.
      try {
        return matteCutout(image, values, maskWidth, maskHeight);
      } catch (error) {
        console.warn("Portrait matting fell back to the segmenter mask", error);
        return segmenterCutout(image, values, maskWidth, maskHeight);
      }
    } finally {
      result.close();
    }
  } finally {
    segmenter.close();
  }
}

function matteCutout(
  image: HTMLImageElement,
  values: Float32Array,
  maskWidth: number,
  maskHeight: number,
) {
  const source = document.createElement("canvas"),
    sourceContext = source.getContext("2d", { willReadFrequently: true });
  source.width = image.naturalWidth;
  source.height = image.naturalHeight;
  if (!sourceContext) throw new Error("Canvas unavailable");
  sourceContext.drawImage(image, 0, 0);
  const pixels = sourceContext.getImageData(0, 0, source.width, source.height);
  const matte = mattePortrait(
    { data: pixels.data, width: pixels.width, height: pixels.height },
    { data: values, width: maskWidth, height: maskHeight },
  );
  const output = document.createElement("canvas"),
    context = output.getContext("2d");
  output.width = matte.width;
  output.height = matte.height;
  if (!context) throw new Error("Canvas unavailable");
  const result = context.createImageData(matte.width, matte.height);
  result.data.set(matte.data);
  context.putImageData(result, 0, 0);
  return cropCutoutToPerson(output, {
    ...matte.bounds,
    maskWidth: matte.width,
    maskHeight: matte.height,
  }).toDataURL("image/png");
}

function segmenterCutout(
  image: HTMLImageElement,
  values: Float32Array,
  maskWidth: number,
  maskHeight: number,
) {
  const maskCanvas = document.createElement("canvas"),
    maskContext = maskCanvas.getContext("2d"),
    output = document.createElement("canvas"),
    context = output.getContext("2d");
  maskCanvas.width = maskWidth;
  maskCanvas.height = maskHeight;
  output.width = image.naturalWidth;
  output.height = image.naturalHeight;
  if (!maskContext || !context) throw new Error("Canvas unavailable");
  const pixels = maskContext.createImageData(maskWidth, maskHeight);
  for (let index = 0; index < values.length; index++) {
    const confidence = Math.max(0, Math.min(1, (values[index] - 0.04) / 0.78)),
      soft = confidence * confidence * (3 - 2 * confidence),
      offset = index * 4;
    pixels.data[offset] = 255;
    pixels.data[offset + 1] = 255;
    pixels.data[offset + 2] = 255;
    pixels.data[offset + 3] = Math.round(soft * 255);
  }
  maskContext.putImageData(pixels, 0, 0);
  context.drawImage(image, 0, 0, output.width, output.height);
  context.globalCompositeOperation = "destination-in";
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(maskCanvas, 0, 0, output.width, output.height);
  const bounds = findPersonBounds(values, maskWidth, maskHeight);
  if (!bounds) throw new Error("No person detected");
  return cropCutoutToPerson(output, {
    ...bounds,
    maskWidth,
    maskHeight,
  }).toDataURL("image/png");
}

function findPersonBounds(values: Float32Array, width: number, height: number) {
  const columns = new Uint16Array(width),
    rows = new Uint16Array(height);
  for (let index = 0; index < values.length; index++) {
    if (values[index] < 0.45) continue;
    const x = index % width,
      y = Math.floor(index / width);
    columns[x]++;
    rows[y]++;
  }
  const columnMinimum = Math.max(2, Math.floor(height * 0.018)),
    rowMinimum = Math.max(2, Math.floor(width * 0.018)),
    minX = columns.findIndex((count) => count >= columnMinimum),
    minY = rows.findIndex((count) => count >= rowMinimum);
  let maxX = -1,
    maxY = -1;
  for (let x = width - 1; x >= 0; x--) {
    if (columns[x] >= columnMinimum) {
      maxX = x;
      break;
    }
  }
  for (let y = height - 1; y >= 0; y--) {
    if (rows[y] >= rowMinimum) {
      maxY = y;
      break;
    }
  }
  return minX < 0 || minY < 0 || maxX < minX || maxY < minY
    ? null
    : { minX, minY, maxX, maxY };
}

function cropCutoutToPerson(
  source: HTMLCanvasElement,
  bounds: {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
    maskWidth: number;
    maskHeight: number;
  },
) {
  const scaleX = source.width / bounds.maskWidth,
    scaleY = source.height / bounds.maskHeight,
    subjectLeft = bounds.minX * scaleX,
    subjectTop = bounds.minY * scaleY,
    subjectRight = (bounds.maxX + 1) * scaleX,
    subjectBottom = (bounds.maxY + 1) * scaleY,
    subjectWidth = subjectRight - subjectLeft,
    subjectHeight = subjectBottom - subjectTop,
    padX = Math.max(source.width * 0.04, subjectWidth * 0.18),
    padTop = Math.max(source.height * 0.03, subjectHeight * 0.08),
    padBottom = Math.max(source.height * 0.02, subjectHeight * 0.05),
    left = Math.max(0, Math.floor(subjectLeft - padX)),
    top = Math.max(0, Math.floor(subjectTop - padTop)),
    right = Math.min(source.width, Math.ceil(subjectRight + padX)),
    bottom = Math.min(source.height, Math.ceil(subjectBottom + padBottom)),
    width = right - left,
    height = bottom - top;
  if (width < 2 || height < 2) return source;
  const cropped = document.createElement("canvas"),
    context = cropped.getContext("2d");
  cropped.width = width;
  cropped.height = height;
  if (!context) return source;
  context.drawImage(source, left, top, width, height, 0, 0, width, height);
  return cropped;
}

function loadAssetImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}
function formatAtlasPhone(value: string | undefined, fallback: string) {
  const raw = value?.trim();
  if (!raw || raw.toLowerCase() === "not provided") return fallback;
  let digits = raw.replace(/\D/g, "");
  if (digits.startsWith("60")) digits = `0${digits.slice(2)}`;
  if (/^01\d{8}$/.test(digits))
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)} ${digits.slice(6)}`;
  if (/^011\d{8}$/.test(digits))
    return `${digits.slice(0, 3)}-${digits.slice(3, 7)} ${digits.slice(7)}`;
  if (/^0[2-9]\d{8}$/.test(digits))
    return `${digits.slice(0, 2)}-${digits.slice(2, 6)} ${digits.slice(6)}`;
  return raw;
}
function formatRen(value: string | undefined) {
  const ren = value?.replace(/^REN\s*(?:NO\.?\s*:?)?\s*/i, "").trim();
  return `(REN No.: ${ren || "NOT SET"})`;
}
function categoryOf(photo: BrandAssetPhoto) {
  return photo.category ?? "atlas";
}
// "other" is a real choice an agent makes in Photos — a portrait kept for artwork without claiming the
// profile or the awards slot — so the board names it rather than mislabelling it as the Atlas photo.
function categoryLabel(photo: BrandAssetPhoto) {
  const category = categoryOf(photo);
  return category === "awards" ? "Awards" : category === "other" ? "Other" : "Atlas";
}
function isMockAgent(photo: BrandAssetPhoto | undefined) {
  return !photo?.agentName || photo.agentId === mockAgent.agentId;
}
function hasRealAtlasDetails(photo: BrandAssetPhoto | undefined) {
  return Boolean(
    photo?.agentMobile && photo?.agentRenTag && !isMockAgent(photo),
  );
}
function getSubsaleDetails(
  photo: BrandAssetPhoto | undefined,
  name: string,
): SubsaleDetails {
  const realName =
    !isMockAgent(photo) && photo?.agentName
      ? photo.agentName
      : name && name !== "AGENT NAME" && name !== mockAgent.agentName
        ? name
        : mockAtlasDetails.name;
  return {
    name: realName,
    mobile: formatAtlasPhone(photo?.agentMobile, mockAtlasDetails.mobile),
    ren: formatRen(photo?.agentRenTag || mockAtlasDetails.ren),
    officePhone: formatAtlasPhone(
      photo?.agentOfficePhone,
      mockAtlasDetails.officePhone,
    ),
  };
}
// 100% stands the portrait the full height of the artwork; the size slider runs 70-80% because that is the
// band where the portrait fills the board beside the text without covering it or shrinking away from it.
// Both position sliders start at the flush right/bottom anchor and run to 30, and a full 100 would hang a
// quarter of the portrait's own size past that edge — so the band ends at 7.5% of it. The portrait may
// therefore overflow the artwork, which is the printed look, but no slider can push it out of the
// composition, and it is never left cropped to a sliver or missing from the board altogether.
const subsalePortraitOverflow = 0.25;
function placeSubsalePortrait(span: number, size: number, value: number) {
  const travel = Math.min(Math.max(value, -100), 100) / 100,
    slack = size * subsalePortraitOverflow,
    low = -slack,
    high = span + slack;
  // A portrait wider or taller than the board plus both allowances cannot satisfy either bound, so it centres.
  if (high < low) return span / 2;
  return travel < 0 ? span + travel * (span - low) : span + travel * (high - span);
}
function fitSubsalePortrait(
  naturalWidth: number,
  naturalHeight: number,
  scale: number,
  position: number,
  offset: number,
) {
  const base = ((bannerHeight / naturalHeight) * scale) / 100,
    width = naturalWidth * base,
    height = naturalHeight * base;
  return {
    x: placeSubsalePortrait(bannerWidth - width, width, offset),
    y: placeSubsalePortrait(bannerHeight - height, height, position),
    width,
    height,
  };
}

type SubsaleTextLayout = {
  mobile: number;
  name: number;
  nameMax: number;
  nameWidth: number;
  ren: number;
  officePhone: number;
};
const bannerFamily =
    '"DIN Alternate","Avenir Next Condensed","Arial Narrow",Arial,sans-serif',
  bannerTracking = "-0.035em",
  renTracking = "-0.025em",
  bannerUnit = 26.5; // 2650px artwork width ÷ 100 container query units
let measureContext: CanvasRenderingContext2D | null | undefined;
function bannerTextWidth(
  text: string,
  size: number,
  weight: number,
  tracking: string,
) {
  if (measureContext === undefined)
    measureContext =
      typeof document === "undefined"
        ? null
        : document.createElement("canvas").getContext("2d");
  if (!measureContext) return 0;
  measureContext.letterSpacing = tracking;
  measureContext.font = `${weight} ${size}px ${bannerFamily}`;
  return measureContext.measureText(text).width;
}
function fitBannerFontSize(
  text: string,
  maxWidth: number,
  fontSize: number,
  weight: number,
  tracking: string,
) {
  let size = fontSize;
  while (size > 42 && bannerTextWidth(text, size, weight, tracking) > maxWidth)
    size -= 4;
  return size;
}
// One layout drives both the preview and the exported PNG, so what the designer sees is what downloads.
function subsaleTextLayout(details: SubsaleDetails): SubsaleTextLayout {
  const mobile = fitBannerFontSize(
      details.mobile,
      textWidth,
      472,
      800,
      bannerTracking,
    ),
    nameMax =
      textWidth -
      Math.min(
        bannerTextWidth(details.ren, 84, 700, renTracking),
        textWidth * 0.45,
      ) -
      34,
    name = fitBannerFontSize(details.name, nameMax, 210, 700, bannerTracking),
    nameWidth = Math.min(
      bannerTextWidth(details.name, name, 700, bannerTracking),
      nameMax,
    ),
    ren = fitBannerFontSize(
      details.ren,
      textWidth - nameWidth - 34,
      84,
      700,
      renTracking,
    ),
    officePhone = fitBannerFontSize(
      details.officePhone,
      1000,
      172,
      700,
      bannerTracking,
    );
  return { mobile, name, nameMax, nameWidth, ren, officePhone };
}
function useSubsaleTextLayout(details: SubsaleDetails) {
  const { mobile, name, ren, officePhone } = details,
    [layout, setLayout] = useState<SubsaleTextLayout | null>(null);
  useEffect(() => {
    let active = true;
    const apply = () => {
      if (active)
        setLayout(subsaleTextLayout({ mobile, name, ren, officePhone }));
    };
    apply();
    void document.fonts?.ready.then(apply);
    return () => {
      active = false;
    };
  }, [mobile, name, ren, officePhone]);
  return layout;
}
function drawBannerText(
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  baseline: number,
  size: number,
  maxWidth: number,
  color: string,
  weight: number,
  tracking: string,
) {
  context.letterSpacing = tracking;
  context.font = `${weight} ${size}px ${bannerFamily}`;
  context.fillStyle = color;
  context.fillText(text, x, baseline, maxWidth);
  context.letterSpacing = "0px";
}
const textLeft = 72,
  portraitLeft = 1800,
  textRight = portraitLeft - 40,
  textWidth = textRight - textLeft; // text never crosses into the portrait cutout at x=1800
const bannerWidth = 2650,
  bannerHeight = 1786; // the portrait is sized and anchored against the full artwork
const defaultSubsaleScale = 80; // 100% stands the portrait the full height of the board, so a new one opens a little short of that, flush right and bottom
function drawSubsaleDetails(
  context: CanvasRenderingContext2D,
  details: SubsaleDetails,
) {
  const layout = subsaleTextLayout(details);
  context.textBaseline = "alphabetic";
  drawBannerText(
    context,
    details.mobile,
    textLeft,
    970,
    layout.mobile,
    textWidth,
    "#231f20",
    800,
    bannerTracking,
  );
  drawBannerText(
    context,
    details.name,
    textLeft,
    1260,
    layout.name,
    layout.nameMax,
    "#332f30",
    700,
    bannerTracking,
  );
  drawBannerText(
    context,
    details.ren,
    textLeft + layout.nameWidth + 34,
    1260,
    layout.ren,
    textWidth - layout.nameWidth - 34,
    "#332f30",
    700,
    renTracking,
  );
  drawBannerText(
    context,
    details.officePhone,
    410,
    1684,
    layout.officePhone,
    1000,
    "#fff",
    700,
    bannerTracking,
  );
}

async function renderSubsaleBanner(
  src: string,
  options: {
    scale: number;
    position: number;
    offset: number;
    details: SubsaleDetails;
  },
) {
  const [template, image] = await Promise.all([
      loadAssetImage("/subsale-banner-template.png"),
      loadAssetImage(src),
    ]),
    canvas = document.createElement("canvas"),
    context = canvas.getContext("2d"),
    width = bannerWidth,
    height = bannerHeight;
  canvas.width = width;
  canvas.height = height;
  if (!context) throw new Error("Canvas unavailable");
  context.fillStyle = "#fff";
  context.fillRect(0, 0, width, height);
  context.drawImage(template, 0, 0, width, height);
  drawSubsaleDetails(context, options.details);
  const portrait = fitSubsalePortrait(
    image.naturalWidth,
    image.naturalHeight,
    options.scale,
    options.position,
    options.offset,
  );
  context.drawImage(
    image,
    portrait.x,
    portrait.y,
    portrait.width,
    portrait.height,
  );
  return canvas.toDataURL("image/png");
}
