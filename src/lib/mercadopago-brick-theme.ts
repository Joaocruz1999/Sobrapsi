import type { CheckoutPricingMethod } from "@/lib/payment-pricing";

const SOBRAPSI_PRIMARY = "#8a5cf5";
const SOBRAPSI_PRIMARY_DARK = "#6d3fd4";
const SOBRAPSI_PRIMARY_LIGHT = "#a78bfa";

// Inter (mesma família do layout.tsx) para os campos seguros do Brick.
const SOBRAPSI_INTER_FONT_URL =
  "https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuLyfAZ9hiJ-Ek-_EeAmM.woff2";

const mercadoPagoBrickStyle = {
  theme: "dark" as const,
  customVariables: {
    textPrimaryColor: "#ffffff",
    textSecondaryColor: "#a1a1aa",
    formBackgroundColor: "transparent",
    inputBackgroundColor: "#18181b",
    baseColor: SOBRAPSI_PRIMARY,
    baseColorFirstVariant: SOBRAPSI_PRIMARY_DARK,
    baseColorSecondVariant: SOBRAPSI_PRIMARY_LIGHT,
    outlinePrimaryColor: "#3f3f46",
    outlineSecondaryColor: "#27272a",
    buttonTextColor: "#ffffff",
    borderRadiusSmall: "8px",
    borderRadiusMedium: "12px",
    borderRadiusLarge: "16px",
    formPadding: "0",
    inputVerticalPadding: "12px",
    inputHorizontalPadding: "12px",
    inputFocusedBoxShadow: "0 0 0 2px rgba(138, 92, 245, 0.35)",
    fontSizeExtraSmall: "0.75rem",
    fontSizeSmall: "0.875rem",
    fontSizeMedium: "0.875rem",
    fontSizeLarge: "0.875rem",
    fontSizeExtraLarge: "0.875rem",
    fontWeightNormal: "400",
    fontWeightSemiBold: "600",
  },
};

export const PAYMENT_BRICK_SECTION_GAP_PX = 24;
export const PAYMENT_METHOD_SELECTOR_PADDING_PX = 14;
export const PAYMENT_FORM_PANEL_PADDING_PX = 0;
export const PAYMENT_FORM_FIELD_GAP_PX = 24;
export const PAYMENT_BRAND_TOP_GAP_PX = 32;
export const PAYMENT_METHOD_ROW_GAP_PX = 20;
export const PAYMENT_METHOD_ICON_SIZE_PX = 28;

function countFieldLabels(element: HTMLElement): number {
  return Array.from(element.querySelectorAll("label")).filter(
    (label) => !label.querySelector('input[type="radio"]')
  ).length;
}

function sortByDocumentPosition(a: HTMLElement, b: HTMLElement) {
  const position = a.compareDocumentPosition(b);
  if (position & Node.DOCUMENT_POSITION_FOLLOWING) return -1;
  if (position & Node.DOCUMENT_POSITION_PRECEDING) return 1;
  return 0;
}

function findPaymentMethodRow(radio: HTMLElement, container: HTMLElement): HTMLElement | null {
  const labeledRow = radio.closest("label");
  if (labeledRow && container.contains(labeledRow)) {
    return labeledRow;
  }

  let current: HTMLElement | null = radio.parentElement;
  while (current && current !== container) {
    if (current.querySelector('input[type="radio"]')) {
      return current;
    }
    current = current.parentElement;
  }

  return radio.parentElement;
}

function findAllPaymentMethodRows(container: HTMLElement): HTMLElement[] {
  const radios = Array.from(container.querySelectorAll<HTMLElement>('input[type="radio"]'));
  const rows: HTMLElement[] = [];

  for (const radio of radios) {
    const row = findPaymentMethodRow(radio, container);
    if (row && !rows.includes(row)) {
      rows.push(row);
    }
  }

  return rows.sort(sortByDocumentPosition);
}

function findActivePaymentMethodRow(container: HTMLElement): HTMLElement | null {
  const checked =
    container.querySelector<HTMLInputElement>('input[type="radio"]:checked') ??
    container.querySelector<HTMLElement>('input[type="radio"]');

  if (!checked) return null;
  return findPaymentMethodRow(checked, container);
}

function findFieldRowWrapper(label: HTMLElement, panel: HTMLElement): HTMLElement {
  let candidate: HTMLElement | null = label.parentElement;

  while (candidate && candidate !== panel) {
    const parent = candidate.parentElement;
    if (!parent || parent === panel) break;

    const labelsInCandidate = countFieldLabels(candidate);
    const labelsInParent = countFieldLabels(parent);

    if (labelsInCandidate >= 2) {
      return candidate;
    }

    if (labelsInParent > labelsInCandidate) {
      return candidate;
    }

    candidate = parent;
  }

  return label.parentElement ?? label;
}

function findPaymentMethodHeaderSection(
  panel: HTMLElement,
  paymentMethodRow: HTMLElement | null
): HTMLElement | null {
  if (!paymentMethodRow) return null;

  let section: HTMLElement | null = paymentMethodRow.parentElement;
  while (section && section !== panel) {
    if (section.contains(paymentMethodRow) && countFieldLabels(section) === 0) {
      return section;
    }
    section = section.parentElement;
  }

  return paymentMethodRow.parentElement;
}

function findBrickFormPanel(container: HTMLElement): HTMLElement | null {
  const paymentMethodRow = findActivePaymentMethodRow(container);
  if (!paymentMethodRow) {
    return container.querySelector<HTMLElement>("form");
  }

  let panel: HTMLElement | null = paymentMethodRow.parentElement;
  let borderedPanel: HTMLElement | null = null;

  while (panel && panel !== container) {
    const styles = window.getComputedStyle(panel);
    const hasBorder =
      styles.borderTopWidth !== "0px" ||
      styles.borderRightWidth !== "0px" ||
      styles.borderBottomWidth !== "0px" ||
      styles.borderLeftWidth !== "0px";

    if (hasBorder) {
      borderedPanel = panel;
    }

    panel = panel.parentElement;
  }

  return borderedPanel ?? paymentMethodRow.parentElement ?? container.querySelector("form");
}

function findBrandRow(panel: HTMLElement): HTMLElement | null {
  const images = Array.from(panel.querySelectorAll<HTMLImageElement>("img"));
  if (images.length < 2) return null;

  const brandImage = images.find((image) => {
    const alt = image.alt?.toLowerCase() ?? "";
    const src = image.src.toLowerCase();
    return /master|visa|elo|amex|card|brand|payment/i.test(`${alt} ${src}`);
  });

  const anchor = brandImage ?? images[0];
  const row = anchor.closest("div");
  if (!row || !panel.contains(row)) return null;

  return row;
}

function resetSpacingAttributes(container: HTMLElement) {
  container.querySelectorAll<HTMLElement>("[data-mp-spacing]").forEach((element) => {
    element.style.marginTop = "";
    element.style.marginBottom = "";
    element.style.paddingBottom = "";
    element.removeAttribute("data-mp-spacing");
  });

  findAllPaymentMethodRows(container).forEach((row) => {
    row.style.marginTop = "";
    row.style.display = "";
    row.style.alignItems = "";
    row.style.gap = "";
    row.style.minHeight = "";
    row.removeAttribute("data-mp-payment-row");

    row.querySelectorAll<HTMLElement>("img, svg").forEach((icon) => {
      icon.style.width = "";
      icon.style.height = "";
      icon.style.maxWidth = "";
      icon.style.maxHeight = "";
      icon.style.flexShrink = "";
      icon.style.objectFit = "";
    });
  });
}

function findExpandedPaymentSection(container: HTMLElement): HTMLElement | null {
  const activeRow = findActivePaymentMethodRow(container);
  if (!activeRow) return null;

  const panel = findBrickFormPanel(container) ?? container;
  let node: HTMLElement | null = activeRow.parentElement;

  while (node && node !== panel) {
    const fieldLabels = node.querySelectorAll('label:not(:has(input[type="radio"]))');
    const paragraphs = Array.from(node.querySelectorAll("p")).filter(
      (paragraph) => paragraph.textContent?.trim()
    );

    if (fieldLabels.length > 0 || paragraphs.length >= 1) {
      return node;
    }

    node = node.parentElement;
  }

  return activeRow.parentElement;
}

function stylePaymentMethodIcons(container: HTMLElement) {
  findAllPaymentMethodRows(container).forEach((row) => {
    row.style.display = "flex";
    row.style.alignItems = "center";
    row.style.gap = "12px";
    row.style.minHeight = "44px";

    row.querySelectorAll<HTMLElement>("img, svg").forEach((icon) => {
      icon.style.width = `${PAYMENT_METHOD_ICON_SIZE_PX}px`;
      icon.style.height = `${PAYMENT_METHOD_ICON_SIZE_PX}px`;
      icon.style.maxWidth = `${PAYMENT_METHOD_ICON_SIZE_PX}px`;
      icon.style.maxHeight = `${PAYMENT_METHOD_ICON_SIZE_PX}px`;
      icon.style.flexShrink = "0";
      icon.style.objectFit = "contain";

      const wrapper = icon.parentElement;
      if (
        wrapper &&
        wrapper !== row &&
        !wrapper.querySelector('input[type="radio"]') &&
        wrapper.querySelectorAll("img, svg").length === 1
      ) {
        wrapper.style.width = "36px";
        wrapper.style.height = "36px";
        wrapper.style.minWidth = "36px";
        wrapper.style.minHeight = "36px";
        wrapper.style.display = "flex";
        wrapper.style.alignItems = "center";
        wrapper.style.justifyContent = "center";
        wrapper.style.flexShrink = "0";
        wrapper.style.padding = "4px";
        wrapper.style.boxSizing = "border-box";
      }
    });
  });
}

function applyPaymentMethodRowSpacing(container: HTMLElement) {
  const rows = findAllPaymentMethodRows(container);
  rows.forEach((row, index) => {
    if (index > 0) {
      row.style.marginTop = `${PAYMENT_METHOD_ROW_GAP_PX}px`;
    }
  });
}

function applyExpandedSectionSpacing(container: HTMLElement) {
  const section = findExpandedPaymentSection(container);
  if (!section) return;

  const children = Array.from(section.children).filter(
    (child): child is HTMLElement => child instanceof HTMLElement
  );

  children.forEach((child, index) => {
    if (index === 0) return;

    child.setAttribute("data-mp-spacing", "field-row");
    child.style.marginTop = `${PAYMENT_FORM_FIELD_GAP_PX}px`;
    child.style.marginBottom = "0";
  });
}

function stylePaymentMethodRows(container: HTMLElement) {
  findAllPaymentMethodRows(container).forEach((row) => {
    row.setAttribute("data-mp-payment-row", "true");
    row.style.padding = `${PAYMENT_METHOD_SELECTOR_PADDING_PX}px`;
    row.style.boxSizing = "border-box";
    row.style.border = "none";
    row.style.outline = "none";
    row.style.boxShadow = "none";
  });
}

function applyActiveMethodContentSpacing(container: HTMLElement, paymentRows: HTMLElement[]) {
  const activeRow = findActivePaymentMethodRow(container);
  if (!activeRow) return;

  const paymentRowSet = new Set(paymentRows);
  let sibling = activeRow.nextElementSibling;

  while (sibling instanceof HTMLElement) {
    if (paymentRowSet.has(sibling)) {
      sibling.setAttribute("data-mp-spacing", "field-row");
      sibling.style.marginTop = `${PAYMENT_FORM_FIELD_GAP_PX}px`;
      break;
    }

    sibling.setAttribute("data-mp-spacing", "field-row");
    sibling.style.marginTop = `${PAYMENT_FORM_FIELD_GAP_PX}px`;
    sibling = sibling.nextElementSibling;
  }
}

function applyFormFieldVerticalSpacing(container: HTMLElement) {
  const panel = findBrickFormPanel(container);
  if (!panel) return;

  resetSpacingAttributes(container);

  const paymentMethodRows = findAllPaymentMethodRows(container);
  const activeRow = findActivePaymentMethodRow(container);
  const headerSection = findPaymentMethodHeaderSection(panel, activeRow);

  const brandRow =
    findBrandRow(panel) ??
    (() => {
      const firstLabel = panel.querySelector<HTMLElement>(
        'label:not(:has(input[type="radio"]))'
      );
      const previous = firstLabel?.previousElementSibling;
      if (previous instanceof HTMLElement && previous.querySelectorAll("img").length >= 2) {
        return previous;
      }
      return null;
    })();

  const inputLabels = Array.from(panel.querySelectorAll<HTMLElement>("label"))
    .filter((label) => !label.querySelector('input[type="radio"]'))
    .sort(sortByDocumentPosition);

  const rowWrappers: HTMLElement[] = [];

  if (brandRow) {
    rowWrappers.push(brandRow);
  }

  for (const label of inputLabels) {
    const wrapper = findFieldRowWrapper(label, panel);
    if (!rowWrappers.includes(wrapper)) {
      rowWrappers.push(wrapper);
    }
  }

  rowWrappers.sort(sortByDocumentPosition);

  rowWrappers.forEach((row, index) => {
    row.setAttribute("data-mp-spacing", row === brandRow ? "brand" : "field-row");

    if (index === 0 && row === brandRow) {
      row.style.marginTop = headerSection ? "0" : `${PAYMENT_BRAND_TOP_GAP_PX}px`;
    } else if (index > 0 || row !== brandRow) {
      row.style.marginTop = `${PAYMENT_FORM_FIELD_GAP_PX}px`;
    } else {
      row.style.marginTop = "0";
    }

    row.style.marginBottom = "0";
  });

  if (headerSection) {
    headerSection.style.paddingBottom = `${PAYMENT_BRAND_TOP_GAP_PX}px`;
    headerSection.style.boxSizing = "border-box";
    headerSection.style.marginBottom = "0";
    headerSection.style.border = "none";
    headerSection.style.outline = "none";
    headerSection.style.boxShadow = "none";
  }

  applyActiveMethodContentSpacing(container, paymentMethodRows);
}

function applyPaymentBrickAlignment(container: HTMLElement) {
  const panel = findBrickFormPanel(container);
  const submitButton = container.querySelector<HTMLElement>('button[type="submit"]');
  const form = container.querySelector<HTMLElement>("form");

  if (form) {
    form.style.width = "100%";
    form.style.maxWidth = "100%";
    form.style.margin = "0";
    form.style.padding = "0";
  }

  if (panel) {
    panel.style.width = "100%";
    panel.style.maxWidth = "100%";
    panel.style.margin = "0";
  }

  if (submitButton) {
    submitButton.style.width = "100%";
    submitButton.style.maxWidth = "100%";
    submitButton.style.display = "flex";
    submitButton.style.justifyContent = "center";
  }

  const headerSection = findPaymentMethodHeaderSection(
    panel ?? container,
    findActivePaymentMethodRow(container)
  );
  if (headerSection) {
    headerSection.style.width = "100%";
    headerSection.style.maxWidth = "100%";
    headerSection.style.marginLeft = "0";
    headerSection.style.marginRight = "0";
  }
}

function styleBrickFormPanel(container: HTMLElement) {
  const panel = findBrickFormPanel(container);
  if (!panel) return;

  panel.classList.add("mp-card-form-panel");
  panel.style.padding = `${PAYMENT_FORM_PANEL_PADDING_PX}px`;
  panel.style.boxSizing = "border-box";
  panel.style.border = "none";
  panel.style.outline = "none";
  panel.style.boxShadow = "none";
}

export function applyPaymentBrickSectionSpacing(containerId: string) {
  const apply = () => {
    const container = document.getElementById(containerId);
    if (!container) return false;

    const submitButton = container.querySelector<HTMLElement>('button[type="submit"]');
    if (!submitButton) return false;

    const title = Array.from(
      container.querySelectorAll<HTMLElement>("h1, h2, h3, h4, p, span, label")
    ).find((element) => /meios de pagamento/i.test(element.textContent ?? ""));

    if (title) {
      title.setAttribute("data-mp-title", "true");
      title.style.display = "none";
      title.style.marginBottom = "0";
    }

    container.querySelectorAll<HTMLElement>("form").forEach((element) => {
      element.style.marginTop = "0";
      element.style.marginBottom = "0";
    });
    submitButton.style.marginTop = "0";
    submitButton.style.marginTop = `${PAYMENT_BRICK_SECTION_GAP_PX}px`;

    stylePaymentMethodRows(container);
    stylePaymentMethodIcons(container);
    applyPaymentMethodRowSpacing(container);
    styleBrickFormPanel(container);
    applyFormFieldVerticalSpacing(container);
    applyExpandedSectionSpacing(container);
    applyPaymentBrickAlignment(container);

    return true;
  };

  const container = document.getElementById(containerId);
  if (container && !container.dataset.mpSpacingBound) {
    container.dataset.mpSpacingBound = "true";
    container.addEventListener("change", (event) => {
      const target = event.target;
      if (target instanceof HTMLInputElement && target.type === "radio") {
        window.setTimeout(apply, 0);
      }
    });
  }

  if (apply()) return;

  window.setTimeout(apply, 50);
  window.setTimeout(apply, 250);
  window.setTimeout(apply, 600);
}

function getDefaultPaymentOption(method: CheckoutPricingMethod) {
  if (method === "card") {
    return { creditCardForm: true };
  }

  return { bankTransferForm: true };
}

export function buildMercadoPagoBrickCustomization(input: {
  method: CheckoutPricingMethod;
  maxInstallments: number;
}) {
  const paymentMethods =
    input.method === "card"
      ? {
          creditCard: "all" as const,
          debitCard: [] as const,
          maxInstallments: input.maxInstallments,
          // Sem parcelas sem juros no Brick quando o produto é só à vista (1x).
          interestFreeInstallments: input.maxInstallments > 1,
        }
      : {
          ticket: "all" as const,
          bankTransfer: "all" as const,
          creditCard: [] as const,
          debitCard: [] as const,
        };

  return {
    visual: {
      font: SOBRAPSI_INTER_FONT_URL,
      style: mercadoPagoBrickStyle,
      defaultPaymentOption: getDefaultPaymentOption(input.method),
    },
    paymentMethods,
  };
}
