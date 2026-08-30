const STOP_WORDS = new Set([
    'a',
    'au',
    'aux',
    'avec',
    'dans',
    'de',
    'des',
    'du',
    'en',
    'et',
    'la',
    'le',
    'les',
    'pour',
    'sans',
    'sur',
    'un',
    'une',
    'à',
    'd',
])

export function normalizeWord(word) {
    return word
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]/g, '')
        .trim()
}

export function levenshtein(a, b) {
    const left = normalizeWord(a)
    const right = normalizeWord(b)

    if (left === right) return 0
    if (!left.length) return right.length
    if (!right.length) return left.length

    const matrix = Array.from(
        { length: left.length + 1 },
        () => Array(right.length + 1).fill(0)
    )

    for (let i = 0; i <= left.length; i++) {
        matrix[i][0] = i
    }

    for (let j = 0; j <= right.length; j++) {
        matrix[0][j] = j
    }

    for (let i = 1; i <= left.length; i++) {
        for (let j = 1; j <= right.length; j++) {
            const cost =
                left[i - 1] === right[j - 1]
                    ? 0
                    : 1

            matrix[i][j] = Math.min(
                matrix[i - 1][j] + 1,
                matrix[i][j - 1] + 1,
                matrix[i - 1][j - 1] + cost
            )
        }
    }

    return matrix[left.length][right.length]
}

function maxDistance(word) {
    if (word.length <= 4) return 0
    if (word.length <= 7) return 1
    return 2
}

export function suggestTagsFromTitle(
    title,
    existingTags
) {
    const words = title
        .split(/\s+/)
        .map(normalizeWord)
        .filter(
            (word) =>
                word.length >= 3 &&
                !STOP_WORDS.has(word)
        )

    const suggestions = []

    for (const tag of existingTags) {
        const tagWord = normalizeWord(tag.name)

        if (!tagWord) continue

        const match = words.some(
            (word) =>
                levenshtein(word, tagWord) <=
                maxDistance(word)
        )

        if (match) {
            suggestions.push(tag)
        }
    }

    return suggestions
}