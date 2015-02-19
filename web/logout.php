<?php
/**
 * Created by PhpStorm.
 * User: willi_000
 * Date: 2/16/2015
 * Time: 6:10 PM
 */
?>
<?php
session_start();
session_destroy();
$_SESSION = array();
?>
<meta content="0;index.php" http-equiv="refresh">