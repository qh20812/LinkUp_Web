'use client'

import { useRef, useState, useEffect, useMemo } from 'react'
import styles from './DatePicker.module.css'
import { useTranslation } from '../hooks/useTranslation'
import SearchSelect from './SearchSelect'

const MIN_YEAR = 1900

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

function toISODate(year: number, monthIndex: number, day: number): string {
  return `${year}-${pad2(monthIndex + 1)}-${pad2(day)}`
}

function daysInMonth(year: number, monthIndex: number): number {
  return new Date(year, monthIndex + 1, 0).getDate()
}

interface DatePickerProps {
  value: string
  onChange: (value: string) => void
  placeholder: string
  todayLabel: string
  monthPlaceholder: string
  yearPlaceholder: string
}

export default function DatePicker({
  value,
  onChange,
  placeholder,
  todayLabel,
  monthPlaceholder,
  yearPlaceholder,
}: DatePickerProps) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const gridRef = useRef<HTMLDivElement>(null)

  const now = new Date()
  const todayISO = toISODate(now.getFullYear(), now.getMonth(), now.getDate())
  const currentYear = now.getFullYear()

  const parsed = useMemo(() => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
    const [y, m, d] = value.split('-').map(Number)
    if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return null
    return { year: y, month: m - 1, day: d }
  }, [value])

  const [view, setView] = useState(() => {
    if (parsed) return { year: parsed.year, month: parsed.month }
    return { year: currentYear, month: now.getMonth() }
  })

  const monthLabel = t(`common.month.${view.month + 1}`)
  const weekdays = Array.from({ length: 7 }, (_, i) => t(`common.weekday.short.${i + 1}`))
  const monthOptions = Array.from({ length: 12 }, (_, i) => ({
    value: String(i + 1),
    label: t(`common.month.${i + 1}`),
  }))
  const yearOptions = Array.from({ length: currentYear - MIN_YEAR + 1 }, (_, i) => ({
    value: String(currentYear - i),
    label: String(currentYear - i),
  }))

  const display = parsed ? `${pad2(parsed.day)}/${pad2(parsed.month + 1)}/${parsed.year}` : ''

  const canPrev = view.year > MIN_YEAR || view.month > 0
  const canNext = view.year < currentYear || (view.year === currentYear && view.month < now.getMonth())

  const rows = useMemo(() => {
    const firstOffset = (new Date(view.year, view.month, 1).getDay() + 6) % 7
    const totalDays = daysInMonth(view.year, view.month)
    const rowCount = Math.ceil((firstOffset + totalDays) / 7)
    const cells: { iso: string; day: number }[] = []
    for (let i = 0; i < rowCount * 7; i += 1) {
      const day = i - firstOffset + 1
      cells.push(day < 1 || day > totalDays ? { iso: '', day: 0 } : { iso: toISODate(view.year, view.month, day), day })
    }
    const result: { iso: string; day: number }[][] = []
    for (let r = 0; r < rowCount; r += 1) result.push(cells.slice(r * 7, r * 7 + 7))
    return result
  }, [view])

  useEffect(() => {
    if (!open) return
    const onPointerDown = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [open])

  useEffect(() => {
    if (!open) return
    const grid = gridRef.current
    if (!grid) return
    const target = grid.querySelector<HTMLButtonElement>('button[data-selected="true"]') ??
      grid.querySelector<HTMLButtonElement>('button[data-today="true"]') ??
      grid.querySelector<HTMLButtonElement>('button[disabled="false"], button:not([disabled])')
    target?.focus()
  }, [open, todayISO])

  const openCalendar = () => {
    if (parsed) setView({ year: parsed.year, month: parsed.month })
    setOpen(true)
  }

  const prevMonth = () => {
    if (!canPrev) return
    setView(view.month === 0 ? { year: view.year - 1, month: 11 } : { year: view.year, month: view.month - 1 })
  }

  const nextMonth = () => {
    if (!canNext) return
    setView(view.month === 11 ? { year: view.year + 1, month: 0 } : { year: view.year, month: view.month + 1 })
  }

  const handlePick = (iso: string) => {
    onChange(iso)
    setOpen(false)
  }

  const handleGridKeyDown = (e: React.KeyboardEvent) => {
    const target = document.activeElement as HTMLElement | null
    const iso = target?.dataset.date
    if (!iso) return
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) return
    e.preventDefault()
    const [y, m, d] = iso.split('-').map(Number)
    const dt = new Date(y, m - 1, d)
    if (e.key === 'ArrowLeft') dt.setDate(dt.getDate() - 1)
    else if (e.key === 'ArrowRight') dt.setDate(dt.getDate() + 1)
    else if (e.key === 'ArrowUp') dt.setDate(dt.getDate() - 7)
    else dt.setDate(dt.getDate() + 7)
    const nextIso = toISODate(dt.getFullYear(), dt.getMonth(), dt.getDate())
    if (nextIso < `${MIN_YEAR}-01-01` || nextIso > todayISO) return
    const el = gridRef.current?.querySelector<HTMLButtonElement>(`button[data-date="${nextIso}"]`)
    el?.focus()
  }

  return (
    <div className={styles.root} ref={rootRef}>
      <button
        type="button"
        className={styles.trigger}
        onClick={openCalendar}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <span className={display ? styles.triggerValue : styles.triggerPlaceholder}>
          {display || placeholder}
        </span>
        <i className={`bx bx-chevron-down ${styles.chevron} ${open ? styles.chevronOpen : ''}`} />
      </button>

      {open && (
        <div className={styles.panel} role="dialog" aria-label={`${monthLabel} ${view.year}`}>
          <div className={styles.header}>
            <button
              type="button"
              className={styles.navBtn}
              onClick={prevMonth}
              disabled={!canPrev}
              aria-label={t('profile.birthday.prevMonth')}
            >
              <i className="bx bx-chevron-left" />
            </button>
            <div className={styles.selector}>
              <SearchSelect
                options={monthOptions}
                value={String(view.month + 1)}
                onChange={(v) => setView({ year: view.year, month: Number(v) - 1 })}
                placeholder={monthPlaceholder}
                emptyText={t('profile.noResults')}
              />
            </div>
            <div className={styles.selector}>
              <SearchSelect
                options={yearOptions}
                value={String(view.year)}
                onChange={(v) => setView({ year: Number(v), month: view.month })}
                placeholder={yearPlaceholder}
                emptyText={t('profile.noResults')}
              />
            </div>
            <button
              type="button"
              className={styles.navBtn}
              onClick={nextMonth}
              disabled={!canNext}
              aria-label={t('profile.birthday.nextMonth')}
            >
              <i className="bx bx-chevron-right" />
            </button>
          </div>

          <div className={styles.grid} ref={gridRef} role="grid" aria-label={`${monthLabel} ${view.year}`} onKeyDown={handleGridKeyDown}>
            <div className={styles.weekRow} role="row">
              {weekdays.map((w) => (
                <span key={w} className={styles.weekCell} role="columnheader">
                  {w}
                </span>
              ))}
            </div>
            {rows.map((row, ri) => (
              <div key={ri} className={styles.weekRow} role="row">
                {row.map((cell, ci) => {
                  if (!cell.iso) return <span key={`${ri}-${ci}`} className={styles.emptyCell} aria-hidden="true" />
                  const isSelected = cell.iso === value
                  const isToday = cell.iso === todayISO
                  return (
                    <button
                      key={cell.iso}
                      type="button"
                      data-date={cell.iso}
                      data-selected={isSelected}
                      data-today={isToday}
                      className={[styles.dayBtn, isSelected ? styles.daySelected : '', isToday ? styles.dayToday : ''].join(' ')}
                      onClick={() => handlePick(cell.iso)}
                      disabled={cell.iso > todayISO}
                      aria-label={`${monthLabel} ${cell.day}, ${view.year}`}
                      aria-pressed={isSelected}
                    >
                      {cell.day}
                    </button>
                  )
                })}
              </div>
            ))}
          </div>

          <div className={styles.footer}>
            <button type="button" className={styles.todayBtn} onClick={() => handlePick(todayISO)}>
              {todayLabel}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}