#include "ThreeBGameState.h"

#include "Net/UnrealNetwork.h"

AThreeBGameState::AThreeBGameState()
{
    bReplicates = true;
}

void AThreeBGameState::GetLifetimeReplicatedProps(TArray<FLifetimeProperty>& OutLifetimeProps) const
{
    Super::GetLifetimeReplicatedProps(OutLifetimeProps);
    DOREPLIFETIME(AThreeBGameState, StoryState);
}

bool AThreeBGameState::ApplyAuthoritativeStoryState(const FThreeBReplicatedStoryState& NewState)
{
    if (!HasAuthority() || NewState.SliceId.IsNone() || NewState.PhaseId.IsNone())
    {
        return false;
    }

    if (NewState.Revision < StoryState.Revision)
    {
        return false;
    }

    if (NewState == StoryState)
    {
        return true;
    }

    StoryState = NewState;
    ForceNetUpdate();
    return true;
}

void AThreeBGameState::OnRep_StoryState()
{
    // Presentation systems may read GetStoryState(). Persistent authority remains on the server.
}
