import { screen } from "@testing-library/dom";
import { cssToObject } from "@uppercod/css-to-object";
import { describe, expect, it, vi } from "vitest";

import pinApi from "../src/api/pin.js";
import { renderRepoCard } from "../src/cards/repo.js";
import { measureText } from "../src/common/render.js";
import { fetchRepo } from "../src/fetchers/repo.js";
import type { RepositoryData } from "../src/fetchers/types.js";
import { themes } from "../src/themes/index.js";

vi.mock("../src/fetchers/repo.js", () => ({
  fetchRepo: vi.fn(),
}));

const fetchRepoMock = vi.mocked(fetchRepo);

const data_repo: { repository: RepositoryData } = {
  repository: {
    nameWithOwner: "anuraghazra/convoychat",
    name: "convoychat",
    description: "Help us take over the world! React + TS + GraphQL Chat App",
    primaryLanguage: {
      color: "#2b7489",
      id: "MDg6TGFuZ3VhZ2UyODc=",
      name: "TypeScript",
    },
    isPrivate: false,
    isArchived: false,
    isTemplate: false,
    stargazerCount: 38000,
    forkCount: 100,
  },
};

describe("Test renderRepoCard", () => {
  it("should leave the default card unchanged when compact mode is disabled", () => {
    expect(renderRepoCard(data_repo.repository, { compact: false })).toBe(
      renderRepoCard(data_repo.repository),
    );
  });

  it("should render correctly", () => {
    document.body.innerHTML = renderRepoCard(data_repo.repository);

    const header = document.querySelector(".header");

    expect(header).toHaveTextContent("convoychat");
    expect(header).not.toHaveTextContent("anuraghazra");
    expect(document.querySelector(".description")).toHaveTextContent(
      // no space between "Chat" and "App" because there's a line break there
      "Help us take over the world! React + TS + GraphQL ChatApp",
    );
    expect(screen.queryByTestId("stargazers")).toHaveTextContent("38k");
    expect(screen.queryByTestId("forkcount")).toHaveTextContent("100");
    expect(screen.queryByTestId("lang-name")).toHaveTextContent("TypeScript");
    expect(screen.queryByTestId("lang-color")).toHaveAttribute(
      "fill",
      "#2b7489",
    );
  });

  it("should display username in title (full repo name)", () => {
    document.body.innerHTML = renderRepoCard(data_repo.repository, {
      show_owner: true,
    });
    expect(document.querySelector(".header")).toHaveTextContent(
      "anuraghazra/convoychat",
    );
  });

  it("should trim header", () => {
    document.body.innerHTML = renderRepoCard({
      ...data_repo.repository,
      name: "some-really-long-repo-name-for-test-purposes",
    });

    expect(document.querySelector(".header")).toHaveTextContent(
      "some-really-long-repo-name-for-test...",
    );
  });

  it("should trim description", () => {
    document.body.innerHTML = renderRepoCard({
      ...data_repo.repository,
      description:
        "The quick brown fox jumps over the lazy dog is an English-language pangram—a sentence that contains all of the letters of the English alphabet",
    });

    const lines = document.querySelectorAll(".description tspan");
    expect(lines[0]).toHaveTextContent(
      "The quick brown fox jumps over the lazy dog is an",
    );
    expect(lines[1]).toHaveTextContent(
      "English-language pangram—a sentence that contains all of",
    );

    // Should not trim
    document.body.innerHTML = renderRepoCard({
      ...data_repo.repository,
      description: "Small text should not trim",
    });

    expect(document.querySelector(".description")).toHaveTextContent(
      "Small text should not trim",
    );
  });

  it("should respect browser_rendering=true", () => {
    document.body.innerHTML = renderRepoCard(
      {
        ...data_repo.repository,
        description:
          "The quick brown fox jumps over the lazy dog is an English-language pangram—a sentence that contains all of the letters of the English alphabet",
      },
      { browser_rendering: true },
    );

    // Browser-side wrapping inside the foreignObject keeps the full text in
    // the DOM; the CSS line-clamp truncates whatever exceeds the line budget
    // at render time.
    const description = document.querySelector<HTMLElement>(".description");
    expect(description).toHaveTextContent(
      "The quick brown fox jumps over the lazy dog is an English-language pangram—a sentence that contains all of the letters of the English alphabet",
    );
    expect(description).toHaveStyle({ "--lines": "3" });

    // Short descriptions should leave the full text visible without clamping.
    document.body.innerHTML = renderRepoCard({
      ...data_repo.repository,
      description: "Small text should not trim",
    });

    expect(document.querySelector(".description")).toHaveTextContent(
      "Small text should not trim",
    );
  });

  it("should render emojis", () => {
    document.body.innerHTML = renderRepoCard({
      ...data_repo.repository,
      description: "This is a text with a :poop: poo emoji",
    });

    // poop emoji may not show in all editors but it's there between "a" and "poo"
    expect(document.querySelector(".description")).toHaveTextContent(
      "This is a text with a 💩 poo emoji",
    );
  });

  it("should hide language if primaryLanguage is null & fallback to correct values", () => {
    document.body.innerHTML = renderRepoCard({
      ...data_repo.repository,
      primaryLanguage: null,
    });

    expect(screen.queryByTestId("primary-lang")).toBeNull();

    document.body.innerHTML = renderRepoCard({
      ...data_repo.repository,
      primaryLanguage: { color: null, name: null },
    });

    expect(screen.queryByTestId("primary-lang")).toBeInTheDocument();
    expect(screen.queryByTestId("lang-color")).toHaveAttribute("fill", "#333");

    expect(screen.queryByTestId("lang-name")).toHaveTextContent("Unspecified");
  });

  it("should render default colors properly", () => {
    document.body.innerHTML = renderRepoCard(data_repo.repository);

    const styleTag = document.querySelector("style");
    const stylesObject = cssToObject(styleTag?.innerHTML ?? "");

    const host = stylesObject[":host"];
    const headerClassStyles = host?.[".header "];
    const descClassStyles = host?.[".description "];
    const iconClassStyles = host?.[".icon "];

    expect(headerClassStyles?.["fill"]?.trim()).toBe("#2f80ed");
    expect(descClassStyles?.["fill"]?.trim()).toBe("#434d58");
    expect(iconClassStyles?.["fill"]?.trim()).toBe("#586069");
    expect(screen.queryByTestId("card-bg")).toHaveAttribute("fill", "#fffefe");
  });

  it("should render custom colors properly", () => {
    const customColors = {
      title_color: "5a0",
      icon_color: "1b998b",
      text_color: "9991",
      bg_color: "252525",
    };

    document.body.innerHTML = renderRepoCard(data_repo.repository, {
      ...customColors,
    });

    const styleTag = document.querySelector("style");
    const stylesObject = cssToObject(styleTag?.innerHTML ?? "");

    const host = stylesObject[":host"];
    const headerClassStyles = host?.[".header "];
    const descClassStyles = host?.[".description "];
    const iconClassStyles = host?.[".icon "];

    const { title_color, text_color, icon_color } = customColors;

    expect(headerClassStyles?.["fill"]?.trim()).toBe(`#${title_color}`);
    expect(descClassStyles?.["fill"]?.trim()).toBe(`#${text_color}`);
    expect(iconClassStyles?.["fill"]?.trim()).toBe(`#${icon_color}`);
    expect(screen.queryByTestId("card-bg")).toHaveAttribute("fill", "#252525");
  });

  it("should render with all the themes", () => {
    Object.entries(themes).forEach(([name, themeData]) => {
      document.body.innerHTML = renderRepoCard(data_repo.repository, {
        theme: name,
      });

      const styleTag = document.querySelector("style");
      const stylesObject = cssToObject(styleTag?.innerHTML ?? "");

      const host = stylesObject[":host"];
      const headerClassStyles = host?.[".header "];
      const descClassStyles = host?.[".description "];
      const iconClassStyles = host?.[".icon "];

      const { title_color, text_color, icon_color, bg_color } = themeData;

      expect(headerClassStyles?.["fill"]?.trim()).toBe(`#${title_color}`);
      expect(descClassStyles?.["fill"]?.trim()).toBe(`#${text_color}`);
      expect(iconClassStyles?.["fill"]?.trim()).toBe(`#${icon_color}`);

      const backgroundElement = screen.queryByTestId("card-bg");
      const backgroundElementFill = backgroundElement?.getAttribute("fill");
      expect([`#${bg_color}`, "url(#gradient)"]).toContain(
        backgroundElementFill,
      );
    });
  });

  it("should render custom colors with themes", () => {
    document.body.innerHTML = renderRepoCard(data_repo.repository, {
      title_color: "5a0",
      theme: "radical",
    });

    const styleTag = document.querySelector("style");
    const stylesObject = cssToObject(styleTag?.innerHTML ?? "");

    const host = stylesObject[":host"];
    const headerClassStyles = host?.[".header "];
    const descClassStyles = host?.[".description "];
    const iconClassStyles = host?.[".icon "];

    expect(headerClassStyles?.["fill"]?.trim()).toBe("#5a0");
    expect(descClassStyles?.["fill"]?.trim()).toBe(
      `#${themes.radical.text_color}`,
    );
    expect(iconClassStyles?.["fill"]?.trim()).toBe(
      `#${themes.radical.icon_color}`,
    );
    expect(screen.queryByTestId("card-bg")).toHaveAttribute(
      "fill",
      `#${themes.radical.bg_color}`,
    );
  });

  it("should render custom colors with themes and fallback to default colors if invalid", () => {
    document.body.innerHTML = renderRepoCard(data_repo.repository, {
      title_color: "invalid color",
      text_color: "invalid color",
      theme: "radical",
    });

    const styleTag = document.querySelector("style");
    const stylesObject = cssToObject(styleTag?.innerHTML ?? "");

    const host = stylesObject[":host"];
    const headerClassStyles = host?.[".header "];
    const descClassStyles = host?.[".description "];
    const iconClassStyles = host?.[".icon "];

    // invalid overrides fall back to the default theme; the un-overridden
    // icon/bg come from the requested `radical` theme
    const { title_color, text_color } = themes.default;
    const { icon_color, bg_color } = themes.radical;

    expect(headerClassStyles?.["fill"]?.trim()).toBe(`#${title_color}`);
    expect(descClassStyles?.["fill"]?.trim()).toBe(`#${text_color}`);
    expect(iconClassStyles?.["fill"]?.trim()).toBe(`#${icon_color}`);
    expect(screen.queryByTestId("card-bg")).toHaveAttribute(
      "fill",
      `#${bg_color}`,
    );
  });

  it("should not render star count or fork count if either of the are zero", () => {
    document.body.innerHTML = renderRepoCard({
      ...data_repo.repository,
      stargazerCount: 0,
    });

    expect(screen.queryByTestId("stargazers")).toBeNull();
    expect(screen.queryByTestId("forkcount")).toBeInTheDocument();

    document.body.innerHTML = renderRepoCard({
      ...data_repo.repository,
      stargazerCount: 1,
      forkCount: 0,
    });

    expect(screen.queryByTestId("stargazers")).toBeInTheDocument();
    expect(screen.queryByTestId("forkcount")).toBeNull();

    document.body.innerHTML = renderRepoCard({
      ...data_repo.repository,
      stargazerCount: 0,
      forkCount: 0,
    });

    expect(screen.queryByTestId("stargazers")).toBeNull();
    expect(screen.queryByTestId("forkcount")).toBeNull();
  });

  it("should render badges", () => {
    document.body.innerHTML = renderRepoCard({
      ...data_repo.repository,
      isArchived: true,
    });

    expect(screen.queryByTestId("badge")).toHaveTextContent("Archived");

    document.body.innerHTML = renderRepoCard({
      ...data_repo.repository,
      isTemplate: true,
    });
    expect(screen.queryByTestId("badge")).toHaveTextContent("Template");
  });

  it("should not render template", () => {
    document.body.innerHTML = renderRepoCard({
      ...data_repo.repository,
    });
    expect(screen.queryByTestId("badge")).toBeNull();
  });

  it("should render translated badges", () => {
    document.body.innerHTML = renderRepoCard(
      {
        ...data_repo.repository,
        isArchived: true,
      },
      {
        locale: "cn",
      },
    );

    expect(screen.queryByTestId("badge")).toHaveTextContent("已归档");

    document.body.innerHTML = renderRepoCard(
      {
        ...data_repo.repository,
        isTemplate: true,
      },
      {
        locale: "cn",
      },
    );
    expect(screen.queryByTestId("badge")).toHaveTextContent("模板");
  });

  it("should render without rounding", () => {
    document.body.innerHTML = renderRepoCard(data_repo.repository, {
      border_radius: 0,
    });
    expect(document.querySelector("rect")).toHaveAttribute("rx", "0");
    document.body.innerHTML = renderRepoCard(data_repo.repository, {});
    expect(document.querySelector("rect")).toHaveAttribute("rx", "4.5");
  });

  it("should fallback to default description", () => {
    document.body.innerHTML = renderRepoCard({
      ...data_repo.repository,
      description: null,
      isArchived: true,
    });
    expect(document.querySelector(".description")).toHaveTextContent(
      "No description provided",
    );
  });

  it("should have correct height with specified `description_lines_count` parameter", () => {
    // Testing short description
    document.body.innerHTML = renderRepoCard(data_repo.repository, {
      description_lines_count: 1,
    });
    expect(document.querySelector("svg")).toHaveAttribute("height", "120");
    document.body.innerHTML = renderRepoCard(data_repo.repository, {
      description_lines_count: 3,
    });
    expect(document.querySelector("svg")).toHaveAttribute("height", "150");

    // Testing long description
    const longDescription =
      "A tool that will make a lot of iPhone/iPad developers' life easier. It shares your app over-the-air in a WiFi network. Bonjour is used and no configuration is needed.";
    document.body.innerHTML = renderRepoCard(
      { ...data_repo.repository, description: longDescription },
      {
        description_lines_count: 3,
      },
    );
    expect(document.querySelector("svg")).toHaveAttribute("height", "150");
    document.body.innerHTML = renderRepoCard(
      { ...data_repo.repository, description: longDescription },
      {
        description_lines_count: 1,
      },
    );
    expect(document.querySelector("svg")).toHaveAttribute("height", "120");
  });

  it("should render an opt-in compact card with larger content and tighter padding", () => {
    document.body.innerHTML = renderRepoCard(data_repo.repository, {
      compact: true,
      description_lines_count: 3,
      theme: "radical",
      title_color: "123456",
    });

    const svg = document.querySelector("svg");
    const stylesObject = cssToObject(
      document.querySelector("style")?.innerHTML ?? "",
    );

    expect(svg).toHaveAttribute("width", "340");
    expect(svg).toHaveAttribute("height", "150");
    expect(screen.queryByTestId("card-title")).toHaveAttribute(
      "transform",
      "translate(18, 30)",
    );
    expect(document.querySelector(".description tspan")).toHaveAttribute(
      "x",
      "18",
    );
    expect(stylesObject[":host"]?.[".header "]?.["font-size"]?.trim()).toBe(
      "19px",
    );
    expect(document.querySelector("style")?.innerHTML).toContain(
      "fill: #123456",
    );
    expect(screen.queryByTestId("card-bg")).toHaveAttribute(
      "fill",
      `#${themes.radical.bg_color}`,
    );
    expect(
      stylesObject[":host"]?.[".description "]?.["font"]?.trim(),
    ).toContain("14px");
    expect(stylesObject[":host"]?.[".gray "]?.["font"]?.trim()).toContain(
      "13px",
    );
    const starIcon = screen
      .queryByTestId("stargazers")
      ?.closest("g")
      ?.previousElementSibling?.querySelector("svg");
    expect(starIcon).toHaveAttribute("width", "18");
    const footer = document.querySelector('g[transform="translate(26, 75)"]');
    const detailGroups = [...(footer?.children ?? [])];
    const getTranslateX = (element: Element | undefined) =>
      Number(
        element?.getAttribute("transform")?.match(/translate\(([^,]+)/)?.[1],
      );

    expect(detailGroups).toHaveLength(3);
    expect(
      getTranslateX(detailGroups[1]) - (15 + measureText("TypeScript", 13)),
    ).toBe(18);
    expect(
      getTranslateX(detailGroups[2]) -
        (getTranslateX(detailGroups[1]) + 20 + measureText("38k", 13)),
    ).toBe(18);

    document.body.innerHTML = renderRepoCard(data_repo.repository, {
      browser_rendering: true,
      compact: true,
      description_lines_count: 3,
    });
    expect(document.querySelector("foreignObject")).toHaveAttribute(
      "width",
      "294",
    );
  });

  it("should keep compact three-line cards the same height", () => {
    const longDescription =
      "A tool that will make a lot of developers' lives easier by providing enough text to wrap across all available lines in the card.";

    document.body.innerHTML = renderRepoCard(data_repo.repository, {
      compact: true,
      description_lines_count: 3,
    });
    expect(document.querySelector("svg")).toHaveAttribute("height", "150");

    document.body.innerHTML = renderRepoCard(
      { ...data_repo.repository, description: longDescription },
      { compact: true, description_lines_count: 3 },
    );
    expect(document.querySelector("svg")).toHaveAttribute("height", "150");
  });

  it("should preserve compact layout with separate light and dark themes", () => {
    document.body.innerHTML = renderRepoCard(data_repo.repository, {
      compact: true,
      browser_rendering: true,
      description_lines_count: 3,
      theme_light: "default",
      theme_dark: "radical",
    });

    const styles = document.querySelector("style")?.innerHTML ?? "";
    const darkStyles = styles.split("@media (prefers-color-scheme: dark)")[1];

    expect(document.querySelector("svg")).toHaveAttribute("width", "340");
    expect(document.querySelector("svg")).toHaveAttribute("height", "150");
    expect(document.querySelector("foreignObject")).toHaveAttribute(
      "width",
      "294",
    );
    expect(styles).toContain("font: 400 14px");
    expect(styles).toContain(`fill: #${themes.default.text_color}`);
    expect(darkStyles).toContain(`fill: #${themes.radical.text_color}`);
    expect(darkStyles).toContain(`stroke: #${themes.radical.text_color}`);
  });

  it("should space compact details consistently without a language", () => {
    document.body.innerHTML = renderRepoCard(
      { ...data_repo.repository, primaryLanguage: null },
      { compact: true },
    );

    const footer = document.querySelector('g[transform^="translate(26, "]');
    const detailGroups = [...(footer?.children ?? [])];

    expect(detailGroups).toHaveLength(2);
    expect(detailGroups[0]).toHaveAttribute("transform", "translate(0, 0)");
    expect(detailGroups[1]).toHaveAttribute(
      "transform",
      `translate(${20 + measureText("38k", 13) + 18}, 0)`,
    );
  });

  it("should let card_width override the compact default width", () => {
    document.body.innerHTML = renderRepoCard(data_repo.repository, {
      compact: true,
      card_width_input: 360,
    });

    expect(document.querySelector("svg")).toHaveAttribute("width", "360");
  });
});

describe("test pin API", () => {
  it("should return a permanent error for an invalid color parameter", async () => {
    const result = await pinApi(
      // api handler accepts a partial options object at runtime
      {
        username: "user",
        repo: "repo",
        title_color: "not-a-color",
      } as Parameters<typeof pinApi>[0],
    );

    expect(result.status).toBe("error - permanent");
    expect(result.content).toContain(
      `Invalid color input for parameter &#34;title_color&#34;`,
    );
  });

  it("should parse compact=true", async () => {
    fetchRepoMock.mockResolvedValue(data_repo.repository);

    const result = await pinApi({
      username: "anuraghazra",
      repo: "convoychat",
      compact: "true",
      description_lines_count: "3",
    } as Parameters<typeof pinApi>[0]);

    expect(result.status).toBe("success");
    expect(result.content).toContain('width="340"');
    expect(result.content).toContain('height="150"');
  });
});
