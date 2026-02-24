class Event {
  Event({
    required this.id,
    required this.name,
    required this.slug,
    required this.publicKey,
    this.lastSynced,
  });

  final String id;
  final String name;
  final String slug;
  final String publicKey;
  final String? lastSynced;

  Map<String, dynamic> toMap() {
    return {
      "id": id,
      "name": name,
      "slug": slug,
      "public_key": publicKey,
      "last_synced": lastSynced,
    };
  }

  factory Event.fromMap(Map<String, dynamic> map) {
    return Event(
      id: map["id"] as String,
      name: map["name"] as String,
      slug: map["slug"] as String,
      publicKey: map["public_key"] as String,
      lastSynced: map["last_synced"] as String?,
    );
  }
}
