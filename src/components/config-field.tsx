import { useEffect, useState } from "react";

import {
  fieldLabel,
  getArrayTemplates,
  getFieldHint,
  getOptionalFieldTemplates,
} from "@/components/studio-sections";

export function ConfigField({
  path,
  value,
  onChange,
  label = fieldLabel(path),
}: {
  path: string;
  value: unknown;
  onChange(value: unknown): void;
  label?: string;
}) {
  const hint = getFieldHint(path);

  if (hint.json) {
    return <JsonField label={label} onChange={onChange} value={value} />;
  }
  if (hint.enumValues && typeof value === "string") {
    return (
      <label className="config-control">
        <span>{label}</span>
        <select aria-label={label} onChange={(event) => onChange(event.target.value)} value={value}>
          {hint.enumValues.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </label>
    );
  }
  if (typeof value === "boolean") {
    return (
      <label className="config-control config-boolean">
        <input
          aria-label={label}
          checked={value}
          onChange={(event) => onChange(event.target.checked)}
          type="checkbox"
        />
        <span>{label}</span>
      </label>
    );
  }
  if (typeof value === "number") {
    return (
      <label className="config-control">
        <span>{label}</span>
        <input
          aria-label={label}
          onChange={(event) => onChange(event.target.value === "" ? 0 : Number(event.target.value))}
          type="number"
          value={value}
        />
      </label>
    );
  }
  if (typeof value === "string") {
    const Control = hint.multiline ? "textarea" : "input";
    return (
      <label className="config-control">
        <span>{label}</span>
        <Control
          aria-label={label}
          onChange={(event) => onChange(event.target.value)}
          value={value}
        />
      </label>
    );
  }
  if (Array.isArray(value)) {
    return <ArrayField label={label} onChange={onChange} path={path} value={value} />;
  }
  if (isRecord(value)) {
    const optionalFields = getOptionalFieldTemplates(path);
    const optionalKeys = new Set(optionalFields.map((field) => field.key));
    return (
      <fieldset className="config-object">
        <legend>{label}</legend>
        <div className="config-object-grid">
          {Object.entries(value).map(([key, child]) => {
            const childLabel = fieldLabel(`${path}.${key}`);
            return (
              <div className="config-field-row" key={key}>
                <ConfigField
                  label={childLabel}
                  onChange={(nextChild) => onChange({ ...value, [key]: nextChild })}
                  path={`${path}.${key}`}
                  value={child}
                />
                {optionalKeys.has(key) && (
                  <button
                    aria-label={`Remove ${childLabel}`}
                    className="config-remove-field"
                    onClick={() => {
                      const nextValue = { ...value };
                      delete nextValue[key];
                      onChange(nextValue);
                    }}
                    type="button"
                  >
                    Remove
                  </button>
                )}
              </div>
            );
          })}
        </div>
        {optionalFields.some((field) => !(field.key in value)) && (
          <div className="config-optional-fields">
            {optionalFields
              .filter((field) => !(field.key in value))
              .map((field) => (
                <button
                  key={field.key}
                  onClick={() =>
                    onChange({
                      ...value,
                      [field.key]: structuredClone(field.value),
                    })
                  }
                  type="button"
                >
                  + Add {field.label}
                </button>
              ))}
          </div>
        )}
      </fieldset>
    );
  }
  return <JsonField label={label} onChange={onChange} value={value} />;
}

function ArrayField({
  path,
  label,
  value,
  onChange,
}: {
  path: string;
  label: string;
  value: unknown[];
  onChange(value: unknown[]): void;
}) {
  const templates = getArrayTemplates(path);
  return (
    <fieldset className="config-array">
      <legend>
        {label} <span>{value.length}</span>
      </legend>
      <div className="array-items">
        {value.map((item, index) => (
          <fieldset aria-label={`${label} item ${index + 1}`} className="array-item" key={index}>
            <legend>Item {index + 1}</legend>
            <div className="array-toolbar">
              <button
                aria-label="Duplicate item"
                onClick={() => onChange(insertAt(value, index + 1, structuredClone(item)))}
                type="button"
              >
                Duplicate
              </button>
              <button
                aria-label="Move item up"
                disabled={index === 0}
                onClick={() => onChange(move(value, index, index - 1))}
                type="button"
              >
                Up
              </button>
              <button
                aria-label="Move item down"
                disabled={index === value.length - 1}
                onClick={() => onChange(move(value, index, index + 1))}
                type="button"
              >
                Down
              </button>
              <button
                aria-label="Delete item"
                onClick={() => onChange(value.filter((_, candidate) => candidate !== index))}
                type="button"
              >
                Delete
              </button>
            </div>
            <ConfigField
              label={typeof item === "object" && item !== null ? `Item ${index + 1}` : "Value"}
              onChange={(nextItem) =>
                onChange(
                  value.map((candidate, candidateIndex) =>
                    candidateIndex === index ? nextItem : candidate,
                  ),
                )
              }
              path={`${path}.${index}`}
              value={item}
            />
          </fieldset>
        ))}
      </div>
      <div className="array-add-row">
        {templates.map((template) => (
          <button
            key={template.label}
            onClick={() => onChange([...value, structuredClone(template.value)])}
            type="button"
          >
            + {template.label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

function JsonField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: unknown;
  onChange(value: unknown): void;
}) {
  const [text, setText] = useState(() => JSON.stringify(value, null, 2));
  const [issue, setIssue] = useState<string>();
  useEffect(() => setText(JSON.stringify(value, null, 2)), [value]);

  return (
    <label className="config-control config-json">
      <span>{label}</span>
      <textarea
        aria-label={label}
        onChange={(event) => {
          const nextText = event.target.value;
          setText(nextText);
          try {
            onChange(JSON.parse(nextText));
            setIssue(undefined);
          } catch {
            setIssue("Enter valid JSON before applying this section.");
          }
        }}
        spellCheck={false}
        value={text}
      />
      {issue && <small role="alert">{issue}</small>}
    </label>
  );
}

function move(values: unknown[], from: number, to: number): unknown[] {
  if (to < 0 || to >= values.length) return values;
  const next = [...values];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

function insertAt(values: unknown[], index: number, item: unknown): unknown[] {
  const next = [...values];
  next.splice(index, 0, item);
  return next;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
