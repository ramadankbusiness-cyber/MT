"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";

type DbCommittee = {
  id: string;
  key: string;
  name: string;
  nameAr: string;
  type?: string;
};

export type CommitteeSelectValue = string | string[] | null;

interface CommitteeSelectProps {
  committees?: DbCommittee[];
  value: CommitteeSelectValue;
  onChange: (value: CommitteeSelectValue) => void;
  mode?: "single" | "multi";
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  showAll?: boolean;
  allLabel?: string;
  valueField?: "id" | "key" | "name";
  name?: string;
  id?: string;
  autoFocus?: boolean;
  includeMTC?: boolean;
}

export function CommitteeSelect({
  committees: committeesProp,
  value,
  onChange,
  mode = "single",
  placeholder,
  disabled = false,
  required = false,
  showAll = false,
  allLabel,
  valueField = "id",
  name,
  id,
  autoFocus,
  includeMTC = false,
}: CommitteeSelectProps) {
  const t = useTranslations("site");
  const locale = useLocale();
  const [committees, setCommittees] = useState<DbCommittee[]>(committeesProp ?? []);
  const [loading, setLoading] = useState(!committeesProp || committeesProp.length === 0);
  const [error, setError] = useState("");

  const fetchCommittees = (cancelledRef?: { current: boolean }) => {
    setLoading(true);
    setError("");
    fetch(`/api/committees${includeMTC ? "?includeMTC=true" : ""}`, { cache: "no-store" })
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load committees");
        return r.json();
      })
      .then((data) => {
        if (cancelledRef?.current) return;
        setCommittees(Array.isArray(data?.committees) ? data.committees : []);
        setLoading(false);
      })
      .catch(() => {
        if (cancelledRef?.current) return;
        if (committeesProp && committeesProp.length > 0) {
          setCommittees(committeesProp);
          setError("");
        } else {
          setError(t("committeeUi.loadFailed"));
        }
        setLoading(false);
      });
  };

  useEffect(() => {
    if (committeesProp && committeesProp.length > 0) {
      setCommittees(committeesProp);
      setLoading(false);
      setError("");
      return;
    }
    const cancelled = { current: false };
    fetchCommittees(cancelled);
    return () => {
      cancelled.current = true;
    };
  }, [committeesProp, includeMTC, t]);

  const retryLoad = () => fetchCommittees();

  const labelFor = (c: DbCommittee) => {
    if (c.key === "mtc") return "MTC";
    return locale === "ar" ? c.nameAr : c.name;
  };

  const mtc = committees.find((c) => c.key === "mtc");
  const regular = committees.filter((c) => c.key !== "mtc");
  const valueArray = mode === "multi" ? (Array.isArray(value) ? value : value ? [String(value)] : []) : [];
  const currentSingle = value === null || value === undefined ? "" : String(value);

  const regularOptions = useMemo(() => regular.map((c) => ({ value: c[valueField] as string, label: labelFor(c) })), [regular, valueField, locale]);

  const handleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    if (mode === "multi") {
      const selected = Array.from(event.target.selectedOptions)
        .map((o) => o.value)
        .filter((v) => v !== "");
      onChange(selected);
    } else {
      onChange(event.target.value);
    }
  };

  if (error) {
    return (
      <div className="committee-select-error" role="alert">
        <p>{error}</p>
        <button type="button" onClick={retryLoad}>
          {t("committeeUi.retry")}
        </button>
      </div>
    );
  }

  if (!loading && committees.length === 0) {
    return (
      <div className="committee-select-empty" role="status">
        <p>{t("committeeUi.empty")}</p>
        <button type="button" onClick={retryLoad}>
          {t("committeeUi.retry")}
        </button>
      </div>
    );
  }

  return (
    <label className="committee-select-wrap" data-testid="committee-select">
      {placeholder && <span className="committee-select-placeholder">{placeholder}</span>}
      <select
        id={id}
        name={name}
        value={mode === "multi" ? valueArray : currentSingle}
        onChange={handleChange}
        disabled={disabled || loading}
        required={required && !loading}
        multiple={mode === "multi"}
        autoFocus={autoFocus}
        dir={locale === "ar" ? "rtl" : "ltr"}
      >
        {showAll && <option value="">{allLabel ?? t("committeeUi.all")}</option>}
        {!showAll && mode === "single" && !currentSingle && <option value="" disabled hidden>{placeholder ?? t("committeeUi.chooseCommittee")}</option>}
        {!showAll && mode === "multi" && valueArray.length === 0 && <option value="" disabled hidden>{placeholder ?? t("committeeUi.chooseCommittee")}</option>}
        {includeMTC && mtc && (
          <optgroup label={locale === "ar" ? "هيدات النادي" : "Club heads"}>
            <option value={mtc[valueField] as string}>{labelFor(mtc)}</option>
          </optgroup>
        )}
        {regularOptions.length > 0 && (includeMTC && mtc
          ? <optgroup label={locale === "ar" ? "اللجان" : "Committees"}>{regularOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</optgroup>
          : regularOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)
        )}
      </select>
      {loading && <span className="committee-select-loading">{t("committeeUi.loading")}</span>}
    </label>
  );
}
