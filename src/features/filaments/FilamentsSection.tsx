import { Section } from '@/components/Section'
import { FilamentStack, type FilamentStackProps } from './FilamentStack'

export function FilamentsSection(props: FilamentStackProps) {
  return (
    <Section title="Filaments" aside={<span className="aside-note">top of print first</span>}>
      <FilamentStack {...props} />
      <p className="hint">
        TD is the HueForge transmission distance. A filament reaches full coverage at about TD × 0.1
        mm. Check your values with a printed step wedge.
      </p>
    </Section>
  )
}
