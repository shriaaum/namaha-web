import React from "react";
import { useTranslation } from "react-i18next";
import "./PujaFilters.css";
import { SORT_OPTIONS } from "./pujaFilterSort";

function PujaFilters({ temples, occasions, value, onChange, onClear, sortOptions = SORT_OPTIONS, title, subtitle, alwaysShowClear = false }) {
  const { t } = useTranslation();
  const set = (key) => (e) => onChange({ ...value, [key]: e.target.value });
  const active = value.temple || value.occasion || value.sort !== "date";

  const sortLabels = {
    date: t("puja.sortDate", { defaultValue: "Date (nearest first)" }),
    popularity: t("puja.sortPopularity", { defaultValue: "Popularity" }),
    topChoice: t("puja.sortTopChoice", { defaultValue: "Top Choice first" }),
    name: t("puja.sortName", { defaultValue: "Name (A–Z)" }),
  };

  return (
    <div className="pf-wrap">
    <div className="pf-heading">
      <span className="pf-heading-title">
        🔎 {title || t("puja.filterTitle", { defaultValue: "Find your puja" })}
      </span>
      <span className="pf-heading-sub">
        {subtitle || t("puja.filterSubtitle", {
          defaultValue: "Filter by temple or occasion, and sort by date or popularity",
        })}
      </span>
    </div>
    <div className="pf-bar">
      <label className="pf-field">
        <span>{t("puja.filterTemple", { defaultValue: "Temple" })}</span>
        <select value={value.temple} onChange={set("temple")}>
          <option value="">{t("puja.allTemples", { defaultValue: "All temples" })}</option>
          {temples.map((x) => (
            <option key={x.value} value={x.value}>{x.label}</option>
          ))}
        </select>
      </label>

      <label className="pf-field">
        <span>{t("puja.filterOccasion", { defaultValue: "Occasion" })}</span>
        <select value={value.occasion} onChange={set("occasion")}>
          <option value="">{t("puja.allOccasions", { defaultValue: "All occasions" })}</option>
          {occasions.map((x) => (
            <option key={x.value} value={x.value}>{x.label}</option>
          ))}
        </select>
      </label>

      <label className="pf-field">
        <span>{t("puja.sortBy", { defaultValue: "Sort by" })}</span>
        <select value={value.sort} onChange={set("sort")}>
          {sortOptions.map((k) => (
            <option key={k} value={k}>{sortLabels[k]}</option>
          ))}
        </select>
      </label>

      {(active || alwaysShowClear) && (
        <button type="button" className="pf-clear" onClick={onClear} disabled={!active}>
          {t("puja.clearFilters", { defaultValue: "Clear filters" })}
        </button>
      )}
    </div>
    </div>
  );
}

export default PujaFilters;
