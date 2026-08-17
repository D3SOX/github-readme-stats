import { Card } from "../common/Card.js";
import { I18n } from "../common/I18n.js";
import { getCardColors, isPrefixedHexColor } from "../common/color.js";
import { kFormatter, wrapTextMultiline } from "../common/fmt.js";
import { encodeHTML } from "../common/html.js";
import { icons } from "../common/icons.js";
import { buildSearchFilter, clampValue, parseEmojis } from "../common/ops.js";
import {
  countWrappedLines,
  createLanguageNode,
  flexLayout,
  iconWithLabel,
  measureText,
  wrappedTextNode,
  wrappedTextStyles,
} from "../common/render.js";
import { repoCardLocales } from "../translations.js";

import { createTextNode } from "./stats.js";

const ICON_SIZE = 16;
const CARD_DEFAULT_WIDTH = 400;
const X_OFFSET = 25;
const DESCRIPTION_FONT_SIZE = 13;
const DESCRIPTION_LINE_HEIGHT_PX = 16;
const DESCRIPTION_MAX_LINES = 3;
const COMPACT_CARD_WIDTH = 340;
const COMPACT_X_OFFSET = 18;
const COMPACT_DESCRIPTION_RIGHT_OFFSET = 28;
const COMPACT_FOOTER_X_OFFSET = 26;
const LANGUAGE_TEXT_X_OFFSET = 15;
const ICON_LABEL_X_OFFSET = 20;
const COMPACT_ICON_SIZE = 18;
const COMPACT_DESCRIPTION_FONT_SIZE = 14;
const COMPACT_DESCRIPTION_LINE_HEIGHT_PX = 17;

/**
 * Retrieves the repository description and wraps it to fit the card width.
 *
 * @param {string} label The repository description.
 * @param {string} textColor The color of the text.
 * @returns {string} Wrapped repo description SVG object.
 */
const getBadgeSVG = (label, textColor, xOffset = 0) => {
  if (!isPrefixedHexColor(textColor)) {
    throw new Error(`Invalid text color: "${textColor}"`);
  }
  if (!Number.isFinite(xOffset)) {
    throw new Error(`Invalid xOffset: "${xOffset}"`);
  }

  return `
    <g data-testid="badge" class="badge" transform="translate(${320 + xOffset}, -18)">
      <rect stroke="${textColor}" stroke-width="1" width="70" height="20" x="-12" y="-14" ry="10" rx="10"></rect>
      <text
        x="23" y="-5"
        alignment-baseline="central"
        dominant-baseline="central"
        text-anchor="middle"
        fill="${textColor}"
      >
        ${encodeHTML(label)}
      </text>
    </g>
  `;
};

/**
 * @typedef {import("../fetchers/types").RepositoryData} RepositoryData Repository data.
 * @typedef {import("./types").RepoCardOptions} RepoCardOptions Repo card options.
 */

/**
 * Renders repository card details.
 *
 * @param {RepositoryData} repo Repository data.
 * @param {Partial<RepoCardOptions>} options Card options.
 * @returns {string} Repository card SVG object.
 */
const renderRepoCard = (repo, options = {}) => {
  const {
    name,
    nameWithOwner,
    description,
    primaryLanguage,
    isArchived,
    isTemplate,
    starCount,
    forkCount,
    totalPRsAuthored,
    totalPRsCommented,
    totalPRsReviewed,
    totalIssuesAuthored,
    totalIssuesCommented,
  } = repo;
  const {
    hide_border = false,
    title_color,
    icon_color,
    text_color,
    bg_color,
    card_width_input,
    show_owner = false,
    browser_rendering = false,
    show = [],
    show_icons = true,
    number_format = "short",
    text_bold = false,
    line_height = 22,
    username,
    theme = "default_repocard",
    border_radius,
    border_color,
    locale,
    description_lines_count,
    compact = false,
  } = options;

  const card_width =
    card_width_input && !isNaN(card_width_input)
      ? card_width_input
      : compact
        ? COMPACT_CARD_WIDTH
        : show.length >= 2
          ? CARD_DEFAULT_WIDTH + 30
          : CARD_DEFAULT_WIDTH;
  const xOffset = compact ? COMPACT_X_OFFSET : X_OFFSET;
  const iconSize = compact ? COMPACT_ICON_SIZE : ICON_SIZE;
  const descriptionFontSize = compact
    ? COMPACT_DESCRIPTION_FONT_SIZE
    : DESCRIPTION_FONT_SIZE;
  const descriptionLineHeight = compact
    ? COMPACT_DESCRIPTION_LINE_HEIGHT_PX
    : DESCRIPTION_LINE_HEIGHT_PX;

  const i18n = new I18n({
    locale,
    translations: repoCardLocales,
  });

  let repoFilter = encodeURIComponent(buildSearchFilter([nameWithOwner], []));
  const encodedUsername = encodeURIComponent(username);
  const STATS = {};
  if (show.includes("prs_authored")) {
    STATS.prs_authored = {
      icon: icons.prs,
      label: i18n.t("repocard.prs-authored"),
      value: totalPRsAuthored,
      id: "prs_authored",
      link: `https://github.com/search?q=${repoFilter}author%3A${encodedUsername}&amp;type=pullrequests`,
    };
  }
  if (show.includes("prs_commented")) {
    STATS.prs_commented = {
      icon: icons.comments,
      label: i18n.t("repocard.prs-commented"),
      value: totalPRsCommented,
      id: "prs_commented",
      link: `https://github.com/search?q=${repoFilter}commenter%3A${encodedUsername}+-author%3A${encodedUsername}&amp;type=pullrequests`,
    };
  }
  if (show.includes("prs_reviewed")) {
    STATS.prs_reviewed = {
      icon: icons.reviews,
      label: i18n.t("repocard.prs-reviewed"),
      value: totalPRsReviewed,
      id: "prs_reviewed",
      link: `https://github.com/search?q=${repoFilter}reviewed-by%3A${encodedUsername}+-author%3A${encodedUsername}&amp;type=pullrequests`,
    };
  }
  if (show.includes("issues_authored")) {
    STATS.issues_authored = {
      icon: icons.issues,
      label: i18n.t("repocard.issues-authored"),
      value: totalIssuesAuthored,
      id: "issues_authored",
      link: `https://github.com/search?q=${repoFilter}author%3A${encodedUsername}&amp;type=issues`,
    };
  }
  if (show.includes("issues_commented")) {
    STATS.issues_commented = {
      icon: icons.discussions_started,
      label: i18n.t("repocard.issues-commented"),
      value: totalIssuesCommented,
      id: "issues_commented",
      link: `https://github.com/search?q=${repoFilter}commenter%3A${encodedUsername}+-author%3A${encodedUsername}&amp;type=issues`,
    };
  }

  const statItems = Object.keys(STATS).map((key, index) =>
    // create the text nodes, and pass index so that we can calculate the line spacing
    createTextNode({
      icon: STATS[key].icon,
      label: STATS[key].label,
      value: STATS[key].value,
      id: STATS[key].id,
      unitSymbol: STATS[key].unitSymbol,
      index,
      showIcons: show_icons,
      shiftValuePos: 14.01,
      bold: text_bold,
      numberFormat: number_format,
      link: STATS[key].link,
      labelXOffset: 23,
    }),
  );

  const extraLHeight = parseInt(String(line_height), 10);
  const lineHeight = 10;
  const header = show_owner ? nameWithOwner : name;
  const langName = (primaryLanguage && primaryLanguage.name) || "Unspecified";
  const langColor = (primaryLanguage && primaryLanguage.color) || "#333";
  const desc = parseEmojis(description || "No description provided");
  const descriptionBoxWidth =
    card_width -
    xOffset -
    (compact ? COMPACT_DESCRIPTION_RIGHT_OFFSET : xOffset);

  let descriptionLinesCount, descriptionSvg;
  if (browser_rendering) {
    // The browser performs the actual text wrapping inside the foreignObject;
    // we only estimate the line count server-side so the SVG can reserve enough
    // height. The estimate uses measureText for font-aware widths instead of a
    // fixed character count.
    descriptionLinesCount = description_lines_count
      ? clampValue(description_lines_count, 1, DESCRIPTION_MAX_LINES)
      : countWrappedLines(
          desc,
          descriptionFontSize,
          descriptionBoxWidth,
          DESCRIPTION_MAX_LINES,
        );
    descriptionSvg = wrappedTextNode({
      text: desc,
      x: xOffset,
      y: -3,
      width: descriptionBoxWidth,
      height: descriptionLinesCount * descriptionLineHeight + 10, // 10px extra for "descenders" like g, j, q, p, y
      lineCount: descriptionLinesCount,
      className: "description",
      testId: "description-text",
    });
  } else {
    const descriptionMaxLines = description_lines_count
      ? clampValue(description_lines_count, 1, DESCRIPTION_MAX_LINES)
      : DESCRIPTION_MAX_LINES;
    const multiLineDescription = wrapTextMultiline(
      desc,
      descriptionBoxWidth,
      descriptionFontSize,
      descriptionMaxLines,
    );
    descriptionLinesCount = description_lines_count
      ? clampValue(description_lines_count, 1, DESCRIPTION_MAX_LINES)
      : multiLineDescription.length;
    descriptionSvg = multiLineDescription
      .map(
        (line) =>
          `<tspan dy="1.2em" x="${xOffset}">${encodeHTML(line)}</tspan>`,
      )
      .join("");
    descriptionSvg = `<text class="description" x="${xOffset}" y="-5">
      ${descriptionSvg}
    </text>`;
  }

  const extraHeight = Object.keys(STATS).length
    ? -7 + (Math.ceil(statItems.length / 2) + 1) * extraLHeight
    : 0;
  const compactThreeLineSpacing =
    compact && descriptionLinesCount === DESCRIPTION_MAX_LINES ? 10 : 0;
  const height = compact
    ? (descriptionLinesCount > 1 ? 110 : 100) +
      descriptionLinesCount * lineHeight +
      extraHeight +
      compactThreeLineSpacing
    : (descriptionLinesCount > 1 ? 120 : 110) +
      descriptionLinesCount * lineHeight +
      extraHeight;

  // returns theme based colors with proper overrides and defaults
  const colors = getCardColors({
    title_color,
    icon_color,
    text_color,
    bg_color,
    border_color,
    theme,
  });

  const svgLanguage = primaryLanguage
    ? createLanguageNode(langName, langColor)
    : "";

  const totalStars = kFormatter(starCount);
  const totalForks = kFormatter(forkCount);
  const svgStars = iconWithLabel(
    icons.star,
    totalStars,
    "stargazers",
    iconSize,
  );
  const svgForks = iconWithLabel(icons.fork, totalForks, "forkcount", iconSize);

  const metadataFontSize = compact ? 13 : 12;
  const metadataItems = compact
    ? [
        {
          svg: svgLanguage,
          size:
            LANGUAGE_TEXT_X_OFFSET + measureText(langName, metadataFontSize),
        },
        {
          svg: svgStars,
          size:
            ICON_LABEL_X_OFFSET +
            measureText(`${totalStars}`, metadataFontSize),
        },
        {
          svg: svgForks,
          size:
            ICON_LABEL_X_OFFSET +
            measureText(`${totalForks}`, metadataFontSize),
        },
      ].filter(({ svg }) => svg)
    : [
        { svg: svgLanguage, size: measureText(langName, metadataFontSize) },
        {
          svg: svgStars,
          size: iconSize + measureText(`${totalStars}`, metadataFontSize),
        },
        {
          svg: svgForks,
          size: iconSize + measureText(`${totalForks}`, metadataFontSize),
        },
      ];
  const starAndForkCount = flexLayout({
    items: metadataItems.map(({ svg }) => svg),
    sizes: metadataItems.map(({ size }) => size),
    gap: compact ? 18 : 25,
  }).join("");

  let extraRows = [];
  for (let i = 0; i < statItems.length; i += 2) {
    extraRows.push(
      flexLayout({
        items: statItems.slice(i, i + 2),
        gap: compact ? 155 : 210,
        direction: "row",
      }).join(""),
    );
  }
  const extraItems = `
  <svg x="0" y="0"><g transform="translate(-3, ${height - 52 - extraHeight})">
      ${flexLayout({
        items: extraRows,
        gap: extraLHeight,
        direction: "column",
      }).join("")}
    </g></svg>
    `;

  const card = new Card({
    defaultTitle:
      header.length > (compact ? 27 : 35)
        ? `${header.slice(0, compact ? 27 : 35)}...`
        : header,
    titlePrefixIcon: icons.contribs,
    width: card_width,
    height,
    border_radius,
    colors,
  });

  card.disableAnimations();
  if (compact) {
    card.paddingX = COMPACT_X_OFFSET;
    card.paddingY = 30;
  }
  card.setHideBorder(hide_border);
  card.setHideTitle(false);
  card.setCSS(`
    .description {
      font: 400 ${descriptionFontSize}px 'Segoe UI', Ubuntu, Sans-Serif;fill: ${colors.textColor};
      ${browser_rendering ? wrappedTextStyles(colors.textColor) : ""}
    }
    .gray { font: 400 ${compact ? 13 : 12}px 'Segoe UI', Ubuntu, Sans-Serif; fill: ${colors.textColor} }
    .badge { font: 600 ${compact ? 12 : 11}px 'Segoe UI', Ubuntu, Sans-Serif; }
    .badge rect { opacity: 0.2 }

    .stat { font: 400 ${compact ? 13 : 12}px 'Segoe UI', Ubuntu, Sans-Serif; fill: ${colors.textColor} }
    ${compact ? ".header { font-size: 19px; }" : ""}
    .stagger {
      opacity: 0;
      animation: fadeInAnimation 0.3s ease-in-out forwards;
    }
    .not_bold { font-weight: 400 }
    .bold { font-weight: 700 }
    .icon {
      fill: ${colors.iconColor};
      display: block;
    }
  `);

  return card.render(`
    ${
      isTemplate
        ? // @ts-ignore
          getBadgeSVG(
            i18n.t("repocard.template"),
            colors.textColor,
            card_width - CARD_DEFAULT_WIDTH,
          )
        : isArchived
          ? // @ts-ignore
            getBadgeSVG(
              i18n.t("repocard.archived"),
              colors.textColor,
              card_width - CARD_DEFAULT_WIDTH,
            )
          : ""
    }

    ${descriptionSvg}

    <g transform="translate(${compact ? COMPACT_FOOTER_X_OFFSET : 30}, ${height - 75 - extraHeight})">
      ${starAndForkCount}
    </g>
    ${extraItems}
  `);
};

export { renderRepoCard };
