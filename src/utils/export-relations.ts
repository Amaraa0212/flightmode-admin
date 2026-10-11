function normalizeToken(value: string): string {
  return value.trim().toLowerCase()
}

function relationRoot(path: string): string {
  const normalizedPath = normalizeToken(path)
  const dotIndex = normalizedPath.indexOf('.')
  return dotIndex >= 0 ? normalizedPath.slice(0, dotIndex) : normalizedPath
}

function firstRelationValue(
  value: Record<string, unknown>,
  candidates: string[]
): unknown {
  for (const candidate of candidates) {
    const resolved = value[candidate]
    if (
      resolved !== null &&
      resolved !== undefined &&
      resolved !== '' &&
      typeof resolved !== 'object'
    ) {
      return resolved
    }
  }

  return undefined
}

function flattenRelationArray(value: unknown): unknown[] {
  if (Array.isArray(value)) {
    return value
  }

  return []
}

function nameCandidates(root: string): string[] {
  switch (root) {
    case 'bank':
      return ['nameMn', 'nameEn', 'name', 'code']
    case 'coin':
      return ['coin', 'symbol', 'name']
    case 'network':
      return ['network', 'name']
    case 'symbol':
      return ['symbol', 'name']
    case 'asset':
      return ['asset', 'symbol', 'name']
    case 'operationaccount':
      return ['name', 'binanceEmail', 'email']
    case 'group':
    case 'role':
      return ['name', 'title']
    default:
      return ['name', 'nameMn', 'nameEn', 'binanceEmail']
  }
}

function genericCandidates(root: string): string[] {
  switch (root) {
    case 'user':
    case 'brokeruser':
      return ['subAccountId', 'subId', 'email', 'name', 'id']
    case 'adminuser':
    case 'createduser':
    case 'updateduser':
      return ['email', 'name', 'id']
    case 'operationaccount':
      return ['name', 'binanceEmail', 'email', 'subAccountId', 'id']
    case 'bank':
      return ['nameMn', 'nameEn', 'name', 'code', 'id']
    case 'coin':
      return ['coin', 'symbol', 'name', 'id']
    case 'network':
      return ['network', 'name', 'id']
    case 'symbol':
      return ['symbol', 'name', 'id']
    case 'asset':
      return ['asset', 'symbol', 'name', 'id']
    case 'group':
    case 'role':
      return ['name', 'title', 'id']
    default:
      return [
        'subAccountId',
        'subId',
        'email',
        'name',
        'nameMn',
        'nameEn',
        'symbol',
        'coin',
        'network',
        'asset',
        'code',
        'title',
        'id',
      ]
  }
}

export function resolveExportRelationPath(path: string, header: string): string {
  const trimmedPath = path.trim()
  if (!trimmedPath || trimmedPath.includes('.')) {
    return trimmedPath
  }

  const root = relationRoot(trimmedPath)
  const normalizedHeader = normalizeToken(header)

  if (['user', 'brokeruser'].includes(root)) {
    if (normalizedHeader.includes('email')) {
      return `${trimmedPath}.email`
    }
    if (normalizedHeader.includes('name')) {
      return `${trimmedPath}.name`
    }
    if (normalizedHeader.includes('id') && !normalizedHeader.includes('sub')) {
      return `${trimmedPath}.id`
    }
    return `${trimmedPath}.subAccountId`
  }

  if (['adminuser', 'createduser', 'updateduser'].includes(root)) {
    if (normalizedHeader.includes('name')) {
      return `${trimmedPath}.name`
    }
    if (normalizedHeader.includes('id') && !normalizedHeader.includes('sub')) {
      return `${trimmedPath}.id`
    }
    return `${trimmedPath}.email`
  }

  if (root === 'operationaccount') {
    if (normalizedHeader.includes('email')) {
      return `${trimmedPath}.binanceEmail`
    }
    if (normalizedHeader.includes('sub')) {
      return `${trimmedPath}.subAccountId`
    }
    return `${trimmedPath}.name`
  }

  return trimmedPath
}

export function resolveExportRelationValue(
  value: unknown,
  path: string,
  header: string
): unknown {
  const arrayValue = flattenRelationArray(value)
  if (arrayValue.length > 0) {
    const parts = arrayValue
      .map((item) => resolveExportRelationValue(item, path, header))
      .filter(
        (item) =>
          item !== null &&
          item !== undefined &&
          item !== '' &&
          typeof item !== 'object'
      )
      .map((item) => String(item))

    return parts.length > 0 ? parts.join(', ') : ''
  }

  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return value
  }

  const root = relationRoot(path)
  const normalizedHeader = normalizeToken(header)
  const objectValue = value as Record<string, unknown>

  if (
    ['user', 'brokeruser'].includes(root) ||
    normalizedHeader.includes('subid') ||
    normalizedHeader.includes('sub account') ||
    normalizedHeader.includes('subaccount')
  ) {
    const candidate = firstRelationValue(objectValue, [
      'subAccountId',
      'subId',
      'sub_account_id',
      'sub_id',
    ])
    if (candidate !== undefined) return candidate
  }

  if (
    normalizedHeader.includes('email') ||
    path.toLowerCase().endsWith('.email') ||
    ['adminuser', 'createduser', 'updateduser'].includes(root)
  ) {
    const candidate = firstRelationValue(objectValue, [
      'email',
      'binanceEmail',
      'binance_email',
    ])
    if (candidate !== undefined) return candidate
  }

  if (
    normalizedHeader.includes('name') ||
    normalizedHeader.includes('admin') ||
    normalizedHeader.includes('operation account') ||
    ['operationaccount', 'bank', 'coin', 'network', 'symbol', 'asset', 'group', 'role'].includes(root)
  ) {
    const candidate = firstRelationValue(objectValue, nameCandidates(root))
    if (candidate !== undefined) return candidate
  }

  const candidate = firstRelationValue(objectValue, genericCandidates(root))
  return candidate !== undefined ? candidate : value
}
