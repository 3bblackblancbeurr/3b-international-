#include "ThreeBGameMode.h"

#include "ThreeBCharacter.h"
#include "ThreeBGameState.h"
#include "ThreeBPlayerState.h"

AThreeBGameMode::AThreeBGameMode()
{
    DefaultPawnClass = AThreeBCharacter::StaticClass();
    PlayerStateClass = AThreeBPlayerState::StaticClass();
    GameStateClass = AThreeBGameState::StaticClass();
}
