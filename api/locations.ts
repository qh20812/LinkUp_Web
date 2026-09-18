import { request } from './api'

export interface Place {
  id: string
  name: { vi: string; en: string }
}

export interface ReverseGeocodeResult {
  matched: boolean
  province?: Place
  ward?: Place
}

export const getProvinces = () =>
  request<{ data: Place[] }>('/locations/provinces')

export const getWards = (provinceId: string) =>
  request<{ data: Place[] }>(`/locations/wards?province_id=${provinceId}`)

export const reverseGeocode = (lat: number, lng: number) =>
  request<ReverseGeocodeResult>('/locations/reverse-geocode', {
    method: 'POST',
    body: JSON.stringify({ lat, lng }),
  })