'use client';

import { Combobox, TextInput, useCombobox } from '@mantine/core';

interface StudioCategoryFieldProps {
  label: string;
  value: string;
  options: string[];
  placeholder?: string;
  getOptionIconClass?: (value: string) => string | null | undefined;
  onChange: (value: string) => void;
}

export function StudioCategoryField({
  label,
  value,
  options,
  placeholder,
  getOptionIconClass,
  onChange,
}: StudioCategoryFieldProps) {
  const combobox = useCombobox({
    onDropdownClose: () => combobox.resetSelectedOption(),
    onDropdownOpen: () => combobox.updateSelectedOptionIndex('active'),
  });

  const normalizedValue = value.trim().toLowerCase();
  const filteredOptions = options.filter((option) => {
    if (!normalizedValue) {
      return true;
    }

    return option.toLowerCase().includes(normalizedValue);
  });

  return (
    <Combobox
      store={combobox}
      withinPortal={false}
      onOptionSubmit={(optionValue) => {
        onChange(optionValue);
        combobox.closeDropdown();
      }}
    >
      <Combobox.Target>
        <TextInput
          label={label}
          value={value}
          placeholder={placeholder}
          radius="md"
          rightSection={<Combobox.Chevron />}
          rightSectionPointerEvents="none"
          onChange={(event) => {
            onChange(event.currentTarget.value);
            combobox.openDropdown();
            combobox.updateSelectedOptionIndex();
          }}
          onFocus={() => combobox.openDropdown()}
          onClick={() => combobox.openDropdown()}
          onBlur={() => combobox.closeDropdown()}
        />
      </Combobox.Target>

      <Combobox.Dropdown hidden={filteredOptions.length === 0}>
        <Combobox.Options>
          {filteredOptions.map((option) => (
            <Combobox.Option value={option} key={option}>
              <span className="studio-category-option">
                {getOptionIconClass ? (
                  <span className="studio-category-option__icon" aria-hidden="true">
                    <i className={getOptionIconClass(option) ?? 'fa-solid fa-utensils'} />
                  </span>
                ) : null}
                <span>{option}</span>
              </span>
            </Combobox.Option>
          ))}
        </Combobox.Options>
      </Combobox.Dropdown>
    </Combobox>
  );
}
