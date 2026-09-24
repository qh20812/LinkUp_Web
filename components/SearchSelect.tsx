'use client'

import { useRef, useState, useEffect, useMemo, useId } from 'react'
import styles from './SearchSelect.module.css'
import { normalizeText } from '../utils/search'

export interface SearchSelectOption {
  value: string
  label: string
  /** Extra text searched against (e.g. both Vietnamese and English names). */
  keywords?: string
}

interface SearchSelectProps {
  options: SearchSelectOption[]
  value: string
  onChange: (value: string) => void
  placeholder: string
  emptyText: string
  searchPlaceholder?: string
  loading?: boolean
  disabled?: boolean
}

export default function SearchSelect({
  options,
  value,
  onChange,
  placeholder,
  emptyText,
  searchPlaceholder,
  loading = false,
  disabled = false,
}: SearchSelectProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const rootRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const listboxId = useId()

  const selected = options.find((o) => o.value === value)

  const filtered = useMemo(() => {
    const q = normalizeText(query)
    const base = q
      ? options.filter((o) => normalizeText(`${o.label} ${o.keywords ?? ''}`).includes(q))
      : options
    const sel = base.find((o) => o.value === value)
    if (sel) {
      return [sel, ...base.filter((o) => o.value !== value)]
    }
    return base
  }, [options, query, value])

  useEffect(() => {
    if (!open) return
    const onPointerDown = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false)
        setQuery('')
        setActiveIndex(0)
      }
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [open])

  useEffect(() => {
    if (open) searchRef.current?.focus()
  }, [open])

  const openDropdown = () => {
    if (disabled) return
    setQuery('')
    setActiveIndex(0)
    setOpen(true)
  }

  const closeDropdown = () => {
    setOpen(false)
    setQuery('')
    setActiveIndex(0)
  }

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value)
    setActiveIndex(0)
    if (listRef.current) listRef.current.scrollTop = 0
  }

  const selectOption = (opt: SearchSelectOption) => {
    onChange(opt.value)
    closeDropdown()
  }

  const moveActive = (dir: 'up' | 'down') => {
    if (filtered.length === 0) return
    const next = dir === 'down'
      ? (activeIndex + 1) % filtered.length
      : (activeIndex - 1 + filtered.length) % filtered.length
    setActiveIndex(next)
    const el = listRef.current?.querySelector<HTMLLIElement>(`[data-index="${next}"]`)
    el?.scrollIntoView({ block: 'nearest' })
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (!open) openDropdown()
      else moveActive('down')
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (open) moveActive('up')
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (open && filtered[activeIndex]) selectOption(filtered[activeIndex])
    } else if (e.key === 'Escape') {
      e.preventDefault()
      closeDropdown()
    } else if (e.key === 'Tab') {
      closeDropdown()
    }
  }

  const showEmpty = !loading && filtered.length === 0

  return (
    <div className={styles.root} ref={rootRef}>
      <button
        type="button"
        className={styles.trigger}
        onClick={openDropdown}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={listboxId}
        aria-activedescendant={open && filtered[activeIndex] ? `${listboxId}-opt-${activeIndex}` : undefined}
        aria-label={selected?.label ?? placeholder}
      >
        <span className={selected ? styles.triggerValue : styles.triggerPlaceholder}>
          {selected ? selected.label : placeholder}
        </span>
        <i className={`bx bx-chevron-down ${styles.chevron} ${open ? styles.chevronOpen : ''}`} />
      </button>

      {open && (
        <div className={styles.dropdown}>
          <div className={styles.searchBox}>
            <i className={`bx bx-search ${styles.searchIcon}`} />
            <input
              ref={searchRef}
              className={styles.searchInput}
              value={query}
              onChange={handleSearchChange}
              onKeyDown={handleKeyDown}
              placeholder={searchPlaceholder ?? placeholder}
            />
            {query && (
              <button
                type="button"
                className={styles.clearBtn}
                onClick={() => {
                  setQuery('')
                  setActiveIndex(0)
                  searchRef.current?.focus()
                }}
                aria-label="Clear search"
              >
                <i className="bx bx-x" />
              </button>
            )}
          </div>

          <ul className={styles.list} ref={listRef} id={listboxId} role="listbox">
            {loading && filtered.length === 0 && (
              <li className={styles.skeletonRow} role="presentation">
                <span className={styles.skeletonLine} />
              </li>
            )}
            {!loading &&
              filtered.map((opt, i) => (
                <li
                  key={opt.value}
                  id={`${listboxId}-opt-${i}`}
                  data-index={i}
                  role="option"
                  aria-selected={opt.value === value}
                  className={`${styles.option} ${i === activeIndex ? styles.optionActive : ''} ${opt.value === value ? styles.optionSelected : ''}`}
                  onMouseEnter={() => setActiveIndex(i)}
                  onClick={() => selectOption(opt)}
                >
                  <i className={`bx bx-check ${styles.optionCheck} ${opt.value === value ? styles.optionCheckVisible : ''}`} />
                  {opt.label}
                </li>
              ))}
            {showEmpty && (
              <li className={styles.emptyRow} role="presentation">
                {emptyText}
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  )
}