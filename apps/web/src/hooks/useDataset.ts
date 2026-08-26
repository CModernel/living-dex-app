import { fetchDataset, type PokemonDataset } from '@living-dex/business-logic'
import { useEffect, useState } from 'react'

export type UseDatasetResult =
  | { dataset: null; loading: true; error: null }
  | { dataset: PokemonDataset; loading: false; error: null }
  | { dataset: null; loading: false; error: Error }

export function useDataset(): UseDatasetResult {
  const [state, setState] = useState<UseDatasetResult>({ dataset: null, loading: true, error: null })

  useEffect(() => {
    let cancelled = false

    fetchDataset()
      .then((dataset) => {
        if (!cancelled) setState({ dataset, loading: false, error: null })
      })
      .catch((error: Error) => {
        if (!cancelled) setState({ dataset: null, loading: false, error })
      })

    return () => {
      cancelled = true
    }
  }, [])

  return state
}
