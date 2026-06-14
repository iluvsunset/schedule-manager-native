fn main() {
    let re = regex::Regex::new(r"^((mailto:\w+)|(tel:\w+)|(https?://\w+)).+").unwrap();
    println!("{}", re.is_match("http://192.168.1.10:3001/api/native-google-auth?sessionId=..."));
}
