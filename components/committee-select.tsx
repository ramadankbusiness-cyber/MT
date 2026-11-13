"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";

type DbCommittee = {
  id: string;
  key: string;
  name: string;
  nameAr: string;
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
}: CommitteeSelectProps) {
  const t = useTranslations("site");
  const locale = useLocale();
  const [committees, setCommittees] = useState<DbCommittee[]>(committeesProp ?? []);
  const [loading, setLoading] = useState(!committeesProp);
  const [error, setError] = useState("");

  useEffect(() => {
    if (committeesProp) {
      setCommittees(committeesProp);
      setLoading(false);
      return;
    }
    setLoading(true);
    fetch("/api/committees")
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load committees");
        return r.json();
      })
      .then((data) => {
        setCommittees(data.committees ?? []);
        setLoading(false);
        setError("");
      })
      .catch(() => {
        setError(t("committeeUi.loadFailed"));
        setLoading(false);
      });
  }, [committeesProp, t]);

  const labelFor = (c: DbCommittee) => (locale === "ar" ? c.nameAr : c.name);

  const options = showAll
    ? [{ value: "", label: allLabel ?? t("committeeUi.all") }, ...committees.map((c) => ({ value: c[valueField], label: labelFor(c) }))]
    : committees.map((c) => ({ value: c[valueField], label: labelFor(c) }));

  const valueArray = mode === "multi" ? (Array.isArray(value) ? value : value ? [value] : []) : [];
  const currentSingle = value === null || value === undefined ? "" : (value as string);

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
        <button
          type="button"
          onClick={() => {
            setLoading(true);
            setError("");
            fetch("/api/committees")
              .then((r) => r.json())
              .then((data) => {
                setCommittees(data.committees ?? []);
                setLoading(false);
              })
              .catch(() => {
                setError(t("committeeUi.loadFailed"));
                setLoading(false);
              });
          }}
        >
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
        {!showAll && (!valueArray.length && mode === "multi" ? <option value="" disabled hidden>{placeholder ?? t("committeeUi.chooseCommittee")}</option> : null)}
        {!showAll && mode === "single" && (!currentSingle ? <option value="" disabled hidden>{placeholder ?? t("committeeUi.chooseCommittee")}</option> : null)}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {loading && <span className="committee-select-loading">{t("committeeUi.loading")}</span>}
    </label>
  );
}
