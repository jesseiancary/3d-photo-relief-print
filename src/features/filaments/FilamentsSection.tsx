import { Hint } from '@/components/Hint'
import { Section } from '@/components/Section'
import { FilamentStack, type FilamentStackProps } from './FilamentStack'

export function FilamentsSection(props: FilamentStackProps) {
  return (
    <Section
      title="Filaments"
      aside={<span className="text-caption text-muted">top of print first</span>}
    >
      <FilamentStack {...props} />
      <Hint>
        TD is the HueForge transmission distance. A filament reaches full coverage at about TD × 0.1
        mm. Check your values with a printed step wedge.
      </Hint>
    </Section>
  )
}
