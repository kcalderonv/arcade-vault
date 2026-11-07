import { notFound } from 'next/navigation';
import { GameDetail } from '@/components/game-detail';
import { GAMES, getGame } from '@/lib/data';
export function generateStaticParams() {
    return GAMES.map((g) => ({ id: g.id }));
}
export default async function GameDetailPage({ params }: PageProps<'/juegos/[id]'>) {
    const { id } = await params;
    const game = getGame(id);
    if (!game) notFound();
    return <GameDetail key={game.id} game={game} />;
}
