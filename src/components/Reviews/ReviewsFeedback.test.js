import { act, fireEvent, render, screen } from "@testing-library/react";
import ReviewsFeedback from "./ReviewsFeedback";
import i18n from "../../i18n";
import { getReviews } from "../../data/reviewsAndFeedback";

const setDesktopViewport = () => {
  Object.defineProperty(window, "innerWidth", { configurable: true, value: 1280 });
  window.dispatchEvent(new Event("resize"));
};

describe("ReviewsFeedback", () => {
  beforeEach(async () => {
    setDesktopViewport();
    await act(async () => { await i18n.changeLanguage("en"); });
  });

  test("uses fallback reviewer details for a benefit card with mapped listing metadata", () => {
    const reviews = getReviews("puja");
    const { container } = render(
      <ReviewsFeedback benefitSource="Chhath Puja" benefits={[{ title: "1. Family harmony", subtitle: "A peaceful home" }, "2) Lasting joy", "Ignored benefit"]} />
    );

    const cards = container.querySelectorAll(".rf-item");
    expect(cards).toHaveLength(4);
    expect(cards[0]).toHaveAttribute("data-testid", "benefit-highlight");
    expect(cards[0]).toHaveTextContent("A peaceful home");
    expect(cards[0]).toHaveTextContent("Lasting joy");
    expect(cards[0]).not.toHaveTextContent("1. Family harmony");
    expect(cards[0]).not.toHaveTextContent("2) Lasting joy");
    const avatar = cards[0].querySelector(".rf-avatar img");
    expect(avatar.getAttribute("src")).toMatch(/^\/review-avatars\/(senior|young)-male-\d+\.png$/);
    fireEvent.error(avatar);
    expect(cards[0].querySelector(".rf-avatar")).toHaveTextContent("AS");
    expect(cards[0].querySelector(".rf-name")).toHaveTextContent("Amit Sharma");
    expect(cards[0].querySelector(".rf-city")).toHaveTextContent("Varanasi");
    expect(cards[0].querySelector(".rf-stars")).toHaveTextContent("★★★★★");
    expect(cards[0]).not.toHaveTextContent(reviews[0].name);
    expect(cards[1]).toHaveTextContent(reviews[0].name);
    expect(cards[2]).toHaveTextContent(reviews[1].name);
    expect(cards[3]).toHaveTextContent(reviews[2].name);
  });

  test("shows one cleaned sentence when the page has a single benefit", () => {
    render(<ReviewsFeedback benefitSource="Sacred Temple" benefits={["1. Peace of mind"]} />);

    const benefitCard = screen.getByTestId("benefit-highlight");
    expect(benefitCard).toHaveTextContent("Peace of mind.");
    expect(benefitCard).not.toHaveTextContent("1. Peace of mind");
    expect(benefitCard).toHaveTextContent("Amit Sharma");
    expect(benefitCard).toHaveTextContent("Varanasi");
    expect(benefitCard.querySelector(".rf-stars")).toHaveTextContent("★★★★★");
  });

  test("preserves valid reviewer details supplied for a benefit card", () => {
    render(<ReviewsFeedback benefitSource={{ name: "Meera Iyer", location: "Chennai", rating: 4 }} benefits={["Peace"]} />);

    const benefitCard = screen.getByTestId("benefit-highlight");
    expect(benefitCard.querySelector(".rf-avatar img").getAttribute("src")).toMatch(/^\/review-avatars\/(senior|young)-female-\d+\.png$/);
    expect(benefitCard).toHaveTextContent("Meera Iyer");
    expect(benefitCard).toHaveTextContent("Chennai");
    expect(benefitCard.querySelector(".rf-stars")).toHaveTextContent("★★★★");
  });

  test("shows only reviews when the page has no benefits", () => {
    const reviews = getReviews("puja");
    const { container } = render(<ReviewsFeedback benefits={[]} />);

    expect(screen.queryByTestId("benefit-highlight")).not.toBeInTheDocument();
    expect(container.querySelectorAll(".rf-item")).toHaveLength(4);
    expect(container.querySelectorAll(".rf-item")[0]).toHaveTextContent(reviews[0].name);
  });

  test.each(["puja", "chadhava"])("never repeats an avatar among the cards shown together (%s)", (serviceType) => {
    const { container } = render(<ReviewsFeedback serviceType={serviceType} benefits={["Peace"]} />);
    const pageCount = Math.max(container.querySelectorAll(".rf-dots button").length, 1);

    for (let index = 0; index < pageCount; index += 1) {
      const pageButton = container.querySelectorAll(".rf-dots button")[index];
      if (pageButton) fireEvent.click(pageButton);
      const sources = [...container.querySelectorAll(".rf-avatar img")].map((image) => image.getAttribute("src"));
      expect(new Set(sources).size).toBe(sources.length);
    }
  });

});
