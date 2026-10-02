// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { defaultSettings } from '@/core/defaults'
import { planTones } from '@/core/tones'
import { filFromPresets } from '@/test/helpers'

import { StackDiagram } from './StackDiagram'

const print = defaultSettings().print
const filaments = filFromPresets([0, 1, 3])
const plan = planTones(filaments, print, { mode: 'photo', count: 3 })

describe('StackDiagram', () => {
  it('shows each tone’s image share as a percentage', () => {
    render(<StackDiagram plan={plan} filaments={filaments} counts={[10, 30, 60]} />)
    expect(screen.getByText('60%')).toBeInTheDocument()
    expect(screen.getByText('30%')).toBeInTheDocument()
    expect(screen.getByText('10%')).toBeInTheDocument()
  })

  it('renders a dash for a tone no pixels use', () => {
    render(<StackDiagram plan={plan} filaments={filaments} counts={[0, 50, 50]} />)
    expect(screen.getByText('–')).toBeInTheDocument()
    expect(screen.getAllByText('50%')).toHaveLength(2)
  })
})
