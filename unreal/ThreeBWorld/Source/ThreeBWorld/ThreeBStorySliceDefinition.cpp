#include "ThreeBStorySliceDefinition.h"

bool UThreeBStorySliceDefinition::FindPhase(FName Id, FThreeBStoryPhaseDefinition& OutPhase) const
{
    for (const FThreeBStoryPhaseDefinition& Phase : Phases)
    {
        if (Phase.Id == Id)
        {
            OutPhase = Phase;
            return true;
        }
    }
    return false;
}

bool UThreeBStorySliceDefinition::FindEvidence(FName Id, FThreeBStoryEvidenceDefinition& OutEvidence) const
{
    for (const FThreeBStoryEvidenceDefinition& Item : Evidence)
    {
        if (Item.Id == Id)
        {
            OutEvidence = Item;
            return true;
        }
    }
    return false;
}
