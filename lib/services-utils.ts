export type Service = {
  id: string
  name: string
  price: number // KES price (for backward compatibility)
  priceUSD?: number // USD price (optional)
  duration: number
}

export type ServiceCategory = {
  id: string
  name: string
  showNotice: boolean
  notice: string
  services: Service[]
}

export type ServiceCatalog = {
  categories: ServiceCategory[]
}

const slugify = (value: string, fallbackPrefix: string) => {
  const base = value
    ? value
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
    : ''
  if (base.length > 0) {
    return base
  }
  return `${fallbackPrefix}-${Math.random().toString(36).slice(2, 8)}`
}

const ensureUniqueId = (desiredId: string | undefined, fallbackName: string, used: Set<string>, prefix: string) => {
  let id = desiredId && desiredId.trim().length > 0 ? desiredId.trim() : slugify(fallbackName, prefix)
  if (id.length === 0) {
    id = `${prefix}-${Math.random().toString(36).slice(2, 10)}`
  }

  let uniqueId = id
  let counter = 2
  while (used.has(uniqueId)) {
    uniqueId = `${id}-${counter++}`
  }
  used.add(uniqueId)
  return uniqueId
}

const coerceNumber = (value: unknown, fallback: number) => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

export const normalizeServiceCatalog = (
  raw: any,
): {
  catalog: ServiceCatalog
  changed: boolean
  serviceCount: number
} => {
  let changed = false

  const usedCategoryIds = new Set<string>()
  const usedServiceIds = new Set<string>()

  const convertLegacy = (legacy: any): ServiceCatalog => {
    const categories: ServiceCategory[] = []

    const pushCategory = (key: string, name: string) => {
      const servicesArray: any[] = Array.isArray(legacy?.[key]) ? legacy[key] : []
      if (servicesArray.length === 0) return

      const categoryId = ensureUniqueId(undefined, name, usedCategoryIds, 'category')

      const services = servicesArray.map((service) => {
        const serviceId = ensureUniqueId(
          typeof service?.id === 'string' ? service.id : undefined,
          service?.name ?? 'Service',
          usedServiceIds,
          'service',
        )
        if (serviceId !== service?.id) changed = true

        return {
          id: serviceId,
          name: typeof service?.name === 'string' ? service.name : 'Service',
          price: coerceNumber(service?.price, 0),
          priceUSD: typeof service?.priceUSD === 'number' ? service.priceUSD : undefined,
          duration: coerceNumber(service?.duration, 60),
        }
      })

      categories.push({
        id: categoryId,
        name,
        showNotice: false,
        notice: '',
        services,
      })
      changed = true
    }

    pushCategory('fullSets', 'Full Sets')
    pushCategory('lashFills', 'Lash Fills')
    pushCategory('otherServices', 'Other Services')

    if (categories.length === 0) {
      categories.push({
        id: ensureUniqueId(undefined, 'Services', usedCategoryIds, 'category'),
        name: 'Services',
        showNotice: false,
        notice: '',
        services: [],
      })
    }

    return { categories }
  }

  const categories: ServiceCategory[] = []

  if (Array.isArray(raw?.categories)) {
    raw.categories.forEach((category: any) => {
      const categoryId = ensureUniqueId(
        typeof category?.id === 'string' ? category.id : undefined,
        category?.name ?? 'Category',
        usedCategoryIds,
        'category',
      )
      if (categoryId !== category?.id) changed = true

      const services: Service[] = Array.isArray(category?.services)
        ? category.services.map((service: any) => {
            const serviceId = ensureUniqueId(
              typeof service?.id === 'string' ? service.id : undefined,
              service?.name ?? 'Service',
              usedServiceIds,
              'service',
            )
            if (serviceId !== service?.id) changed = true

            return {
              id: serviceId,
              name: typeof service?.name === 'string' ? service.name : 'Service',
              price: coerceNumber(service?.price, 0),
              priceUSD: typeof service?.priceUSD === 'number' ? service.priceUSD : undefined,
              duration: coerceNumber(service?.duration, 60),
            }
          })
        : []

      categories.push({
        id: categoryId,
        name: typeof category?.name === 'string' && category.name.trim().length > 0 ? category.name.trim() : 'Category',
        showNotice: Boolean(category?.showNotice),
        notice: typeof category?.notice === 'string' ? category.notice : '',
        services,
      })
    })
  }

  const catalog = categories.length > 0 ? { categories } : convertLegacy(raw)
  const serviceCount = catalog.categories.reduce((sum, category) => sum + category.services.length, 0)

  return { catalog, changed, serviceCount }
}


