import * as path from 'path'
import { v4 as uuid } from 'uuid'
import { BASE_URL_MAP_MARKER_CATEGORY } from '@/constants/file-path'

/**
 * Map marker file halpers.
 */
export const generateMapMarkerFilename = (originalFilename: string): string => {
    const timestamp = new Date().getTime()
    const ext = path.extname(originalFilename)
    const filename = `map-marker-${uuid()}-${timestamp}${ext}`
    return filename
}

export const generateMapMarkerLink = (filename: string): string => {
    return `${BASE_URL_MAP_MARKER_CATEGORY}/${filename}`
}
