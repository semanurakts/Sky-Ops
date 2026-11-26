
export interface DashboardMetrics {
  totalFlights: number
  delayedFlights: number
  riskyPersonnel: number
  occupiedGates: number
  gateCapacity: number
  gateOccupancyPercent: number
  activeFlights: number
  densityScore: number
  densityMax: number
}

export interface DashboardPilot {
  id: string
  name: string
  role: string
  genderIcon: string | null
}

export interface DashboardFlight {
  id: string
  flightNo: string
  route: string
  departureDate: string
  departureTime: string
  gate: string | null
  status: string
  airlineName: string | null
  pilot: DashboardPilot | null
  crewCount: number
}

export interface DashboardOverview {
  generatedAt: string
  metrics: DashboardMetrics
  recentFlights: DashboardFlight[]
}

export interface TrafficPoint {
  hour?: number
  label?: string
  date?: string
  count: number
}

export interface DashboardTraffic {
  period: 'today' | 'week'
  date: string
  data: TrafficPoint[]
}
